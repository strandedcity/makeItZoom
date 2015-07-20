
// This tiny Position Object lets us pass updates around from the MakeItZoom CSS Scene to the WebGL Scene.
// If any events library were in use here such as BackBone or jQuery, that would be a better way.
// Even Three.js's EventDispatcher would be a better solution here, but I want the example to demonstrate
// use without any dependencies.
function PositionObject(){

    this.left = 200 * (Math.round(Math.random()*40) - 20);
    this.top = 200 * (Math.round(Math.random()*30) - 15);
    this.set(this.left,-this.top,0); // for Three.js, UP is POSITIVE
    this._listeners = [];

    this.addListener = function(listener) {
        this._listeners.push(listener);
    };
    this.updatePosition = function(deltaY,deltaX){
        // for CSS, DOWN is POSITIVE
        // for Three.js, UP is POSITIVE
        // This discrepency needs to be worked out now
        this.left += deltaX;
        this.top += deltaY;
        this.setX(this.left);
        this.setY(-this.top);  // UP is POSITIVE
        for (var i=0; i<this._listeners.length; i++){
            var callback = this._listeners[i].updatePosition;
            if (typeof callback === "function") callback.call(this._listeners[i],this);
        }
    };
}
PositionObject.prototype = Object.create(THREE.Vector3.prototype);
PositionObject.prototype.constructor = PositionObject;

function setupExample3(zoomInstance){
    function randomBright(){
        return Math.round(100 + Math.random() * 75);
    }

    var loremipsum = ("Lorem ipsum dolor sit amet, consectetur adipiscing elit. In ex massa, venenatis nec eros nec, ornare imperdiet nulla. Donec in erat tincidunt, posuere lacus maximus, porta nibh. Nam dolor orci, suscipit at dolor non, dignissim consequat sapien. Ut ut massa et enim consectetur tempus. Duis non eleifend orci, eu imperdiet ex. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aliquam in blandit ex. Proin varius urna a congue vestibulum. Sed convallis sem turpis, quis bibendum nunc commodo non. Ut quis ligula at ligula pellentesque congue quis ut odio. Nam sed ex nunc. Mauris tristique lorem a purus lobortis, vitae pellentesque nisl sodales. Sed eget aliquam est, faucibus vestibulum nunc. Aenean cursus ante quam, eu sagittis arcu tincidunt auctor. Proin convallis efficitur enim non malesuada. Morbi nec tellus mattis elit pellentesque ornare. Sed vehicula orci dolor, quis interdum lorem finibus vel. Interdum et malesuada fames ac ante ipsum primis in faucibus.").split(" ");
    function randomWords(){
        var index = Math.round(Math.random()*(loremipsum.length-20));
        return loremipsum.slice(index,index + Math.round(Math.random()*10) + 1).join(" ");
    }

    var nodeCount = 100,
        nodes = [];
    for (var i=0; i<nodeCount; i++){
        // Create a textarea with some random text, coloring, and positioning
        var ta = document.createElement("textarea");
        ta.className = "draggable";
        ta.style.backgroundColor = "rgb("+randomBright()+","+randomBright()+","+randomBright()+")";
        ta.innerText = randomWords();
        var pos = new PositionObject();
        ta.positionObject = pos;
        ta.style.top = pos.top + "px";
        ta.style.left = pos.left + "px";
        nodes.push(ta);

        // Add the text area to the zoomable container
        // positionObject is a Vector3 that adds top and left properties, so makeItZoom can use it for offsets
        zoomInstance.addZoomable(ta);
    }

    ////////////////////////
    // Now, use threejs/webgl to draw some lines connecting these boxes for a big nodal network
    // diagram that you couldn't browse without zooming!
    var glScene = new THREE.Scene(),
        glRenderer = new THREE.WebGLRenderer( { alpha: true, antialias: true}),
        zoomRenderer = zoomInstance.getRenderer(),
        camera = zoomInstance.getCamera(),
        material = new THREE.LineBasicMaterial({color: 0x000000}),
        geometries = [];

    glRenderer.setSize(zoomRenderer.domElement.clientWidth, zoomRenderer.domElement.clientHeight);
    document.body.appendChild(glRenderer.domElement);

    // Each box should be connected to one other, so on average each will get two connections
    for (var j=0; j<nodeCount; j++){
        var p1 = nodes[j].positionObject,
            p2 = nodes[Math.floor(Math.random()*nodeCount)].positionObject;

        // Add some connective lines
        var geometry = new THREE.Geometry();
        geometry.vertices.push(p1);
        geometry.vertices.push(p2);
        geometries.push(geometry);

        var line = new THREE.Line(geometry, material, THREE.LineStrip);

        glScene.add(line);
    }

    glRenderer.render(glScene,camera);


    // MakeItZoom controls the camera for you; you just need to render your webGL scene at the right moments
    zoomInstance.addEventListener("mz_render",function(e){
        // No need to worry about the numeric values passed in through "e".
        // Just re-render the glScene -- makeItZoom shares a camera!
        glRenderer.render(glScene,camera);
    });

    return {
        nodes: nodes,
        glScene: glScene,
        glRenderer: glRenderer,
        camera: camera,
        geometries: geometries
    }
}
