//! The simulation, run where it was written.
//!
//! The ornament is CodinCod's TypeScript and stays that way: this hosts it in
//! V8 and reads one typed array back. That array is the whole of the boundary,
//! which is the point. `Seascape.qml` spends the better part of a frame handing
//! the same numbers over one property at a time.
use std::ffi::c_void;

pub struct Sim {
    context: v8::Global<v8::Context>,
    sea: v8::Global<v8::Object>,
    /// The bridge's own buffer, borrowed rather than copied. V8 allocates it
    /// once and never moves it, so a frame costs nothing to read.
    floats: *const f32,
    room: usize,
    /// Last, because it is dropped last: a handle into an isolate that has
    /// already been disposed is a handle into nothing, and Rust drops a struct's
    /// fields in the order they are written.
    isolate: v8::OwnedIsolate,
}

impl Sim {
    pub fn new(source: &str) -> Self {
        hosted();

        let mut isolate = v8::Isolate::new(v8::CreateParams::default());
        let (context, sea, floats, room) = {
            v8::scope!(let handle_scope, &mut isolate);
            let context = v8::Context::new(handle_scope, Default::default());
            let scope = &v8::ContextScope::new(handle_scope, context);

            let code = v8::String::new(scope, source).expect("bundle too large");
            let script = v8::Script::compile(scope, code, None).expect("bundle would not compile");
            script.run(scope).expect("bundle would not run");

            let global = context.global(scope);
            let name = v8::String::new(scope, "Sea").unwrap();
            let sea: v8::Local<v8::Object> = global
                .get(scope, name.into())
                .expect("no Sea")
                .try_into()
                .expect("Sea is not an object");

            let name = v8::String::new(scope, "geometry").unwrap();
            let array: v8::Local<v8::Float32Array> = sea
                .get(scope, name.into())
                .expect("no geometry")
                .try_into()
                .expect("geometry is not a Float32Array");
            let store = array
                .get_backing_store()
                .expect("geometry has no backing store");
            let floats = unsafe {
                (store.data().unwrap().as_ptr() as *const u8).add(array.byte_offset()) as *const f32
            };
            let room = array.byte_length() / 4;

            (
                v8::Global::new(scope, context),
                v8::Global::new(scope, sea),
                floats,
                room,
            )
        };

        // V8 enters an isolate as it is made, and a thread may only leave the
        // one it entered last. Two seas exist at once every time one is planted
        // to replace another, so this one is left rather than held: `call`
        // enters it for as long as it is running and nothing else does.
        unsafe { isolate.exit() };

        Sim {
            context,
            sea,
            floats,
            room,
            isolate,
        }
    }

    /// One of the bridge's functions, with numbers in and a number out.
    pub fn call(&mut self, name: &str, args: &[f64]) -> f64 {
        unsafe { self.isolate.enter() };
        let out = self.said(name, args);
        unsafe { self.isolate.exit() };
        out
    }

    /// The call itself, in a block of its own so that every scope it opens is
    /// shut before the isolate is left.
    fn said(&mut self, name: &str, args: &[f64]) -> f64 {
        v8::scope!(let handle_scope, &mut self.isolate);
        let context = v8::Local::new(handle_scope, &self.context);
        let scope = &v8::ContextScope::new(handle_scope, context);
        let sea = v8::Local::new(scope, &self.sea);

        let key = v8::String::new(scope, name).unwrap();
        let f: v8::Local<v8::Function> = sea
            .get(scope, key.into())
            .unwrap_or_else(|| panic!("no {name} on the bridge"))
            .try_into()
            .unwrap_or_else(|_| panic!("{name} is not a function"));

        let numbers: Vec<v8::Local<v8::Value>> = args
            .iter()
            .map(|a| v8::Number::new(scope, *a).into())
            .collect();
        let out = f
            .call(scope, sea.into(), &numbers)
            .unwrap_or_else(|| panic!("{name} threw"));
        out.number_value(scope).unwrap_or(0.0)
    }

    /// The last published frame, as the bridge left it.
    pub fn frame(&self, floats: usize) -> &[f32] {
        assert!(floats <= self.room, "a frame outgrew the bridge's buffer");
        unsafe { std::slice::from_raw_parts(self.floats, floats) }
    }
}

impl Drop for Sim {
    /// An isolate is disposed by the thread standing in it, and this one is
    /// left standing in nothing between calls. So it is entered for the last
    /// time here, before the handles into it are dropped and before it is.
    fn drop(&mut self) {
        unsafe { self.isolate.enter() };
    }
}

/// V8 itself, which a process gets one of.
///
/// The platform belongs to the process rather than to an isolate, and the crate
/// that keeps that state panics on being handed a second one. A sea is planted
/// again whenever the day turns over, a screen arrives or a screen changes
/// size, so a second `Sim` is ordinary rather than exceptional: the first one
/// starts V8 and the rest are given the one already running.
///
/// Never disposed. Stopping V8 is permanent and the last thing a process does
/// is exit, which stops it anyway.
fn hosted() {
    static ONCE: std::sync::Once = std::sync::Once::new();

    ONCE.call_once(|| {
        let platform = v8::new_default_platform(0, false).make_shared();
        v8::V8::initialize_platform(platform);
        v8::V8::initialize();
    });
}

/// V8 keeps raw pointers to its own allocations; this only exists so the
/// pointer above can be held beside the isolate that owns it.
unsafe impl Send for Sim {}
const _: fn() = || {
    let _ = std::mem::size_of::<*const c_void>();
};
