/**
 * CSS2DRenderer for MakeItZoom Based on CSS2DRenderer for Three.js
 * Based on http://www.emagix.net/academic/mscs-project/item/camera-sync-with-css3-and-webgl-threejs
 * @author mrdoob / http://mrdoob.com/
 * Rewritten for MakeItZoom by @aStrandedCity / http://strandedcity.com
 */

THREE.CSS2DObject = function ( element ) {

	THREE.Object3D.call( this );

	this.element = element;
	this.element.style.position = 'absolute';

	this.addEventListener( 'removed', function ( event ) {

		if ( this.element.parentNode !== null ) {

			this.element.parentNode.removeChild( this.element );

		}

	} );

};

THREE.CSS2DObject.prototype = Object.create( THREE.Object3D.prototype );

//

THREE.CSS2DRenderer = function (element) {
    var _alignment = MZ.ALIGNMENT.TOP_LEFT;
	var _width, _height;
	var _widthHalf, _heightHalf;
    var _hardwareAccelerated = true;
	
	var cache = {
		camera: { fov: 0, style: '' },
		objects: {},
        fov: 1,
        clientHeight: 0
	};

	var domElement = document.createElement( 'div' );
    if (!!element) {domElement = element;}
	domElement.style.overflow = 'hidden';

	this.domElement = domElement;

	var cameraElement = document.createElement( 'div' );

	domElement.appendChild( cameraElement );

    this.setIsHardwareAccelerated = function(hardwareAccelerated){
        _hardwareAccelerated = hardwareAccelerated;
    };

    this.setAlignment = function(alignment) {
        _alignment = MZ.ALIGNMENT.TOP_LEFT;

        // Could do some error-checking here, but the CSS2DRenderer is really part of makeItZoom
        // so the validation there will do it for us in this case
        if (alignment === MZ.ALIGNMENT.CENTER) {
            _alignment = MZ.ALIGNMENT.CENTER;
        }
    };

	this.setSize = function ( width, height ) {

		_width = width;
		_height = height;

		_widthHalf = _width / 2;
		_heightHalf = _height / 2;

		domElement.style.width = width + 'px';
		domElement.style.height = height + 'px';

		cameraElement.style.width = width + 'px';
		cameraElement.style.height = height + 'px';

	};

	var renderObject = function ( object, camera ) {

		if ( object instanceof THREE.CSS2DObject ) {

            //var matrixElements = object.matrixWorld.elements;  // 12,13 --> x, y
			var style = '';//' matrix(1,0,0,1,'+matrixElements[12]+','+matrixElements[13]+')';

			var element = object.element;
			var cachedStyle = cache.objects[ object.id ];

			if ( cachedStyle === undefined || cachedStyle !== style ) {

				element.style.WebkitTransform = style;
				element.style.MozTransform = style;
				element.style.oTransform = style;
				element.style.transform = style;

				cache.objects[ object.id ] = style;

			}

			if ( element.parentNode !== cameraElement ) {

				cameraElement.appendChild( element );

			}

		}

		for ( var i = 0, l = object.children.length; i < l; i ++ ) {

			renderObject( object.children[ i ], camera );

		}

	};

	this.render = function ( scene, camera ) {

		var fov = 0.5 / Math.tan( THREE.Math.degToRad( camera.fov * 0.5 ) ) * _height;

		if ( cache.camera.fov !== fov ) {
			cache.camera.fov = fov;
		}

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse( camera.matrixWorld );

        var x = -camera.position.x,
            y = camera.position.y;

        if (_alignment == MZ.ALIGNMENT.TOP_LEFT) {
            x += _widthHalf;
            y += _heightHalf;
        }

        var style =
            " scale("+this.getCurrentZoomScale(camera,domElement)+")" +
            " translate(" + x + "px," + y + "px)" +
            (_hardwareAccelerated ? " translate3d(0,0,0)" : "");

		if ( cache.camera.style !== style ) {

			cameraElement.style.WebkitTransform = style;
			cameraElement.style.MozTransform = style;
			cameraElement.style.oTransform = style;
			cameraElement.style.transform = style;
			cache.camera.style = style;

		}

		renderObject( scene, camera );

	};

    this.getCurrentZoomScale = function(camera,domElement){
        // Field of view never changes for one camera so long as the rendering area is the same.
        // Automatically recalculate if something changes, otherwise use existing values
        var fov = cache.fov;
        if (cache.clientHeight !== domElement.clientHeight || typeof  cache.fov === "undefined") {
            fov = 0.5 / Math.tan( THREE.Math.degToRad( camera.fov * 0.5 ) ) * domElement.clientHeight;
            cache.fov = fov;
        }

		return fov/camera.position.z;
    }

};
