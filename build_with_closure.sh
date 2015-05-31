java \
    -jar compiler.jar \
    --js \
        src/threejs_files/Three.js \
        src/threejs_files/Vector2.js \
        src/threejs_files/Vector3.js \
        src/threejs_files/Quaternion.js \
        src/threejs_files/Matrix4.js \
        src/threejs_files/EventDispatcher.js \
        src/threejs_files/Math.js \
        src/threejs_files/Object3D.js \
        src/threejs_files/Camera.js \
        src/threejs_files/PerspectiveCamera.js \
        src/threejs_files/Scene.js \
        src/js/CSS3DRenderer.js \
        src/js/OrbitControls.js \
        src/js/makeItZoom.js \
    --js_output_file dist/makeItZoom_0.0.1_noDeps.min.js \
    --language_in ECMASCRIPT5 \
    --compilation_level ADVANCED_OPTIMIZATIONS \
    --warning_level QUIET
