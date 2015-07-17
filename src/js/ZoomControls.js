/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;
    this._enableInteractions = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 1.0;
    this.zoomTowardMouse = true;

	// Limits to how far you can dolly in and out
    this.minZoomScale = 0.05;
    this.maxZoomScale = 1;
	this.currentZoomScale = 1;

    // Bounds let the user set a container in which zoom and pan are possible.
    this.bounds = null;

	// Set to true to disable this control
	this.panButton = 2; // right drag to pan by default
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();
	var lastQuaternion = new THREE.Quaternion();

	var STATE = { NONE : -1, DOLLY : 1, PAN : 2, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();

	// so camera.up is the orbit axis
	var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

    // Pass in the scale of the zoomable workspace that the user will see as an absolute percentage
    this.setScale = function(sc){
        var fov = 0.5 / Math.tan( THREE.Math.degToRad( this.object.fov * 0.5 ) ) * this.domElement.clientHeight,
            targetZ = fov/sc;

        scale = targetZ / this.object.position.z;
    };

    this.setMaxZoomScale = function(max){this.maxZoomScale = max;};
    this.setMinZoomScale = function(min){
        if (this.bounds === null) this.minZoomScale = min;
        else this.minZoomScale = this.calculateMinZoomScaleFromBounds(this.bounds);
    };
    this.calculateMinZoomScaleFromBounds = function(bounds){
        var minHorizontal = this.domElement.clientWidth / (bounds.right - bounds.left),
            minVertical = this.domElement.clientHeight / (bounds.bottom - bounds.top);

        return Math.min(minHorizontal,minVertical);
    };
    this.validateBounds = function(bounds){
        function isNumber(obj){
            return toString.call(obj) === '[object Number]';
        }

        if (bounds == null || typeof bounds != "object") return null;

        var boundNames = ["top","left","bottom","right"],
            boundSigns = [-1,-1,1,1],
            atLeastOneSpecified = false,
            normalizedBounds = {};

        for (var i=0; i<boundNames.length; i++){
            if (isNumber(bounds[boundNames[i]])) {
                atLeastOneSpecified = true;
            }
            normalizedBounds[boundNames[i]] = isNumber(bounds[boundNames[i]]) ? bounds[boundNames[i]] : boundSigns[i] * Infinity;
        }

        if (!atLeastOneSpecified) {
            // When user defines a bounds object but fails to define any legitimate bounds, show a console error
            THREE.warn("Invalid bounds object specified.");
            return null;
        }

        return normalizedBounds;
    };
    this.setBounds = function(bounds){
        var normalizedBounds = this.validateBounds(bounds);
        this.bounds = normalizedBounds;
        if (normalizedBounds !== null) {
            this.setMinZoomScale(1);
        }
    };

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {

			// perspective
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: ZoomControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	this.dollyIn = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}


		scale /= dollyScale;
	};

	this.dollyOut = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale *= dollyScale;

	};

    this.unproject = function (camera){
        var vector = new THREE.Vector3();

        vector.set(
            ( scope.clientX / scope.domElement.clientWidth ) * 2 - 1,
            - ( scope.clientY / scope.domElement.clientHeight ) * 2 + 1,
            0.5 );


        vector.unproject( camera );
        var dir = vector.sub( camera.position ).normalize();

        var distance = - camera.position.z / dir.z;

        return camera.position.clone().add( dir.multiplyScalar( distance ) );
    };

//    this.unprojectScreenPoint = function (camera,point){
//        var vector = new THREE.Vector3();
//        vector.set(
//            ( point.x / scope.domElement.clientWidth ) * 2 - 1,
//            - ( point.y / scope.domElement.clientHeight ) * 2 + 1,
//            0.5 );
//
//        var domElementSize = new THREE.Vector3();
//        domElementSize.set(scope.domElement.clientWidth/2, -scope.domElement.clientHeight/2,0);
//
//        vector.unproject( camera );
//        var dir = vector.sub( camera.position ).normalize();
//
//        var distance = - camera.position.z / dir.z;
//
//        return camera.position.clone().add( dir.multiplyScalar( distance )).add(domElementSize);
//    };

	this.update = function (skipRecentering, skipBoundsCheck) {

        var adjustmentsMade = false;
        var mousePositionPreZoom;
        if (scope.recenterCursor) mousePositionPreZoom = scope.unproject(this.object).clone();

		var position = this.object.position;

		offset.copy( position ).sub( this.target );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
        var fov = 0.5 / Math.tan( THREE.Math.degToRad( this.object.fov * 0.5 ) ) * this.domElement.clientHeight;
        offset.z = Math.max( fov/this.maxZoomScale, Math.min( fov/this.minZoomScale, radius ) );

		// so we can query it from outside at any point:
		scope.currentZoomScale = fov/offset.z;


		// Apply and then clear the offset and scale transforms:
		this.target.add( pan );
		position.copy( this.target ).add( offset );
		scale = 1;
		pan.set( 0, 0, 0 );

        if (scope.recenterCursor === true && skipRecentering !== true) {
            adjustmentsMade = true;
            scope.recenterCursor = false;
            // This is normally done in the renderer, but since we're including
            // a "pan" whose amount depends on the future location of the mouse
            // pointer in the scene AFTER the current zoom, we're doing it here.
            this.object.updateMatrixWorld();
            var diff = scope.unproject(this.object).sub(mousePositionPreZoom);

            scope.panLeft(diff.x);
            scope.panUp(-diff.y);
        }

        // Lastly, check bounds!
        // Before adding PAN to the current camera position, verify that pan will result in a valid in-bounds position. Correct it if not
        // Check bounds. Must be done after all other calculations,
        // since another update() cycle is required to fix positioning

        if (scope.bounds !== null && skipBoundsCheck !== true) {
            // offset = the position that's about to be rendered,
            // offset = the difference in position between the TARGET (x,y info for current projection) and POSITION (of camera)
            // position = the position that was rendered previously

            // PAN = the yet-to-be-applied difference in x,y
            // On every render iteration, PAN and RADIUS/OFFSET are collected as diffs then applied to the camera position

            // Store some deltas for the bounds
            var deltaXLeft = 0,
                deltaYTop = 0,
                deltaXRight = 0,
                deltaYBottom = 0;

            // Set up some variables to store the current window as viewed through the camera
            var h2 = this.domElement.clientHeight/ 2,
                w2 = this.domElement.clientWidth/2,
                aspectRatio = w2 / h2,
                verticalViewFromOffsetPosition = offset.z * Math.tan(THREE.Math.degToRad(this.object.fov * 0.5)),
                horizontalViewFromOffsetPosition = verticalViewFromOffsetPosition * aspectRatio;

            // Enforce top bound
            if (verticalViewFromOffsetPosition - h2 + position.y + pan.y > -scope.bounds.top) {
                deltaYTop +=
                    - verticalViewFromOffsetPosition
                    - scope.bounds.top
                    + h2
                    - position.y
                    - pan.y;
            }

            // enforce left bound
            if (- horizontalViewFromOffsetPosition + w2 + position.x + pan.x < scope.bounds.left) {
                deltaXLeft +=
                    horizontalViewFromOffsetPosition
                    + scope.bounds.left
                    - w2
                    - position.x
                    - pan.x;
            }

            // Enforce bottom bound
            if (+verticalViewFromOffsetPosition - position.y - pan.y + h2 > scope.bounds.bottom) {
                deltaYBottom +=
                    + verticalViewFromOffsetPosition
                    - scope.bounds.bottom
                    + h2
                    - position.y
                    - pan.y;
            }

            // enforce right bound
            if (horizontalViewFromOffsetPosition + position.x + pan.x + w2 > scope.bounds.right) {
                deltaXRight +=
                    - horizontalViewFromOffsetPosition
                    + scope.bounds.right
                    - w2
                    - position.x
                    - pan.x;
            }

            // Cull floating point problems:
            if (Math.abs(deltaXLeft) < 0.001) deltaXLeft = 0;
            if (Math.abs(deltaXRight) < 0.001) deltaXRight = 0;
            if (Math.abs(deltaYBottom) < 0.001) deltaYBottom = 0;
            if (Math.abs(deltaYTop) < 0.001) deltaYTop = 0;

            if (deltaXLeft !== 0 || deltaYTop !== 0 || deltaXRight !== 0 || deltaYBottom !== 0) {
                adjustmentsMade = true;
                var vpan = deltaYTop + deltaYBottom,
                    hpan = deltaXLeft + deltaXRight;
                if (deltaYTop !== 0 && deltaYBottom !== 0) {
                    // If both top and bottom bounds are active, just recenter the camera by using the AVERAGE correction
                    vpan /= 2;
                    pan.setY(0); // no mouse recentering allowed
                }
                if (deltaXLeft !== 0 && deltaXRight !== 0) {
                    hpan /= 2;
                    pan.setX(0); // no mouse recentering allowed
                }

                // Add back existing pan, in case the mouse centering has produced a valid value
                // If the mouse centering would have put the whole mess out of bounds
                pan.set(hpan + pan.x, vpan + pan.y, 0);
            }
        }

        if (adjustmentsMade) {
            // Apply the pan transform again. We've adjusted to keep the mouse pointer
            // above the same spot in the scene
            this.target.add( pan );
            position.copy( this.target ).add( offset );
            pan.set( 0, 0, 0 );
            scale = 1;
        }

		// update condition is:
		// min(camera displacement, camera rotation in radians)^2 > EPS
		// using small-angle approximation cos(x/2) = 1 - x^2 / 8

		if ( lastPosition.distanceToSquared( this.object.position ) > EPS
		    || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
			lastQuaternion.copy (this.object.quaternion );

		}

	};


	this.reset = function () {

		state = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );

		this.update();

	};

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;

		if ( event.button === 1 ) {
			if ( scope.noZoom === true ) return;
            event.preventDefault();

			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );

		} else if ( event.button === scope.panButton ) {
			if ( scope.noPan === true ) return;
            event.preventDefault();

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

            // If the mouse button is lifted fast enough, this click should propagate at mouseup:
            scope.rightClick = {
                time: new Date(),
                originalEvent: event
            };
		}

		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

        if ( state === STATE.DOLLY ) {

			if ( scope.noZoom === true ) return;

			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( scope.noPan === true ) return;

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

		}

		scope.update();

	}

	function onMouseUp( event ) {

		if ( scope.enabled === false ) return;

        if (event.button == 2 && scope.rightClick !== "undefined") {
            // right button mouseup could trigger a context menu event, if it occurs fast enough:
            if (new Date() - scope.rightClick.time < 130) {
                var savedEvent = scope.rightClick.originalEvent;
                var wrappedEvent = new CustomEvent('mz_contextmenu');
                wrappedEvent["clientX"] = savedEvent["clientX"];
                wrappedEvent["clientY"] = savedEvent["clientY"];
                wrappedEvent["target"] = savedEvent["target"];
                savedEvent.target.dispatchEvent(wrappedEvent);
            }
        }

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel( event ) {
        if (scope.zoomTowardMouse === true) {
            scope.clientX = event.clientX;
            scope.clientY = event.clientY;
            scope.recenterCursor = true;
        }

		if ( scope.enabled === false || scope.noZoom === true ) return;

		//event.preventDefault();
		//event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else {

			scope.dollyIn();

		}

		scope.update();
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;
		
		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( 0, scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.BOTTOM:
				scope.pan( 0, - scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.LEFT:
				scope.pan( scope.keyPanSpeed, 0 );
				scope.update();
				break;

			case scope.keys.RIGHT:
				scope.pan( - scope.keyPanSpeed, 0 );
				scope.update();
				break;

		}

	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate
                // rotate functionality removed
				return;

			case 2:	// two-fingered touch: dolly

				if ( scope.noZoom === true ) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;

				state = STATE.TOUCH_PAN;

				panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:

				state = STATE.NONE;

		}

		scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

                // rotate functionality removed
				return;

			case 2: // two-fingered touch: dolly

				if ( scope.noZoom === true ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					scope.dollyOut();

				} else {

					scope.dollyIn();

				}

				dollyStart.copy( dollyEnd );

				scope.update();
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;
				if ( state !== STATE.TOUCH_PAN ) return;

				panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				panDelta.subVectors( panEnd, panStart );
				
				scope.pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

				scope.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

    // This function acts as a setter, but also atttaches and detaches a bunch of event listeners.
    // Could be separated into two functions if useful, but I don't anticipate ever wanting these things
    // out of sync with each other
    this.enableInteractions = (function(state){
        var element = this.domElement,
            oldState = this._enableInteractions,
            newState = state !== false,
            eventMappings = {
                // register most events just for the domelement under our control
                "mousedown": {element: element, handler: onMouseDown},
                "mousewheel": {element: element, handler: onMouseWheel},
                "DOMMouseScroll": {element: element, handler: onMouseWheel},
                "touchstart": {element: element, handler: touchstart},
                "touchend": {element: element, handler: touchend},
                "touchmove": {element: element, handler: touchmove},

                // window events
                "keydown": {element: window, handler: onKeyDown}
            },
            action = newState !== false ? "addEventListener" : "removeEventListener";

        // Do nothing if no change. Exception: the first run.
        if (oldState === newState && this.__setupComplete === true) {
            return;
        }
        this.__setupComplete = true;
        this._enableInteractions = newState;

        // (dis/en)able interactions
        for (var k in eventMappings) {
            if (eventMappings.hasOwnProperty(k)) {
                // apply "addEventListener" or "removeEventListener" depending on which is requested
                // Syntax for this line is a little confusing, but minimizes code duplication and conditionals
                // that vary both for the element to which the listener is attached and whether events are being
                // attached or detached. Each time it runs, it ends up executing a line like this:
                // this.domElement.addEventListener.apply(this.domElement, ["mousedown",onMouseDown, false]);
                eventMappings[k].element[action].apply(eventMappings[k].element, [k, eventMappings[k].handler, false]);
            }
        }
    }).bind(this);

    this.enableInteractions(this._enableInteractions);

	// force an update at start
	this.update();

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
