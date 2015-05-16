function makeItZoom(){
    var options = arguments[0] || {};
    this.init(options);
}

makeItZoom.prototype.init = function(options){
    options.containerId = options.containerId || "makeItZoom";
    options.maxZoomScale = options.maxZoomScale || 1.0;
    options.minZoomScale = options.minZoomScale || 0.1;
    options.zoomSpeed = options.zoomSpeed || 2.0;
    options.zoomMode = options.zoomMode || 0; // Zoom around container center. 1 = Zoom around pointer
    this.options = options;

    var container = document.getElementById(options.containerId);

    this.width = container.offsetWidth;
    this.height = container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 1, 1000000 );
    this.camera.position.z = 1200;
    this.scene = new THREE.Scene();

    // CSS scene handles standard DOM elements and styling, such as <input> fields, drop-downs, etc.
    this.renderer = new THREE.CSS3DRenderer();
    this.renderer.setSize( this.width, this.height );
    document.body.appendChild( this.renderer.domElement );
    this.renderer.domElement.className = "makeitzoom_container";

    this.render = this.render.bind(this);

    this.attachControls();

    this.importDOM.call(this,container);

    this.render();

//    this.setupContextMenu();
//    this.setupDraggableEventHandlers();
//
//    this.attachMetakeyDetectors();
};

//makeItZoom.prototype.defineOptions = function(){
//    window.MZ = {
//        ZOOM_MODE: {
//            CENTER: 0,  // Zoom around DOM container's center
//            CURSOR: 1   // Zoom around mouse pointer
//        }
//    }
//};

makeItZoom.prototype.importDOM =function(container){
    // Must loop over children twice to find their offsets, then move them into the right container
    // If children are positioned using DOM flow to begin with, they will pile on top of
    // each other as they are removed from the dom rather than maintaining correct relative positions
    // Solution: store offsets, then convert to CSS3D Objects
    var that = this;
    this.childElementIterator(container,function(child){
        child.mzOffset = that.getOffset(child);
    });
    this.childElementIterator(container,function(child){
        that.addZoomable.call(that,child,child.mzOffset);
    });
};

makeItZoom.prototype.childElementIterator = function(parent,childCallback){
    var that=this,
        children = parent.children;
    for (var i = 0; i < children.length; i++) {
        var zoomEl = children[i];
        childCallback.call(that,zoomEl);
    }
};

makeItZoom.prototype.attachControls = function(){
    var that = this;
    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
    this.controls.noRotate = true;
    this.controls.zoomSpeed = this.options.zoomSpeed;
    this.controls.minZoomScale = this.options.minZoomScale;
    this.controls.maxZoomScale = this.options.maxZoomScale;

    this.controls.addEventListener( 'change', this.render );
//        $(this.controls.domElement).on('dblclick',{workspace: that},this.showChooser);
//        $(this.controls.domElement).on('click',{workspace: that},this.hideChooser);
    this.render();
};

makeItZoom.prototype.render = function(){
    this.renderer.render(this.scene,this.camera);
};

makeItZoom.prototype.addZoomable = function(element, offset){

    var cssObject = new THREE.CSS3DObject( element );
    cssObject.position.x = offset.left;
    cssObject.position.y =  offset.top;
    cssObject.position.z = 0;

    this.scene.add(cssObject);
};

makeItZoom.prototype.getOffset = function(el){
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
};
