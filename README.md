# makeItZoom.js - Easy ZUIs
A JavaScript Framework that makes Zooming User Interfaces Easy

Web applications can now do real work, and frequently real work requires real estate. makeItZoom.js gives you infinite real estate for your web application, along with several tools that every serious web application will need at its core:

- Infinitely Zooming Workspace
- CSS Styling works normally
- Native HTML controls, such as inputs
- Dependency Free: Use whichever JS Libraries and CSS Frameworks you're already using, and no extras
- Context Menu support (Plays nice with a library of your choice)
- Drag and Drop Events (Plays nice with a library of your choice)

It has no dependencies. To use it, just include the script at the top of your page:

```HTML
<script type="text/javascript" src="makeItZoom.min.js"></script>
```

You can specify the DOM element that will contain the zoomable interface. All child elements will zoom. Use the class "makeItZoom", or specify your own during init. Here's some makeItZoom-able markup:

```HTML
<div class="makeItZoom">
  <div class="box">This box will zoom</div>
  <div class="box">
    <div class="child">
      This box will zoom with its parent
    </div>
  </div>
</div>
```

At the bottom of your page, initialize makeItZoom. Every configurable parameter has a default, so you can call simply makeItZoom(), but everything is configurable. Defaults are:

```HTML
<script type="text/javascript">
  makeItZoom({
    containerId: "makeItZoom", // optional
    customContextMenuClass: "contextMenu", // if none specified, context menus are "off"
    contextMenuHandler: function(element){}, // when a user right-clicks or long-taps an item with the contextMenu class, this callback should return a dictionary of context options for that element eg: {"opt1": "Delete", "opt2": "Save", "opt3": "Print"}
    contextMenuSelectionHandler: function(element,selection){}, // When a user selects an option from a context menu
    suppressNativeContextMenu: false, // suppresses the browser's context menu even if no context menu callback is supplied
    zoomableDrag: function(element,startPosition){}, // callback when the user has started dragging a zoomable element to a new position. startPosition is given in world coordinates of an un-zoomed space
    zoomableDrop: function(element, endPosition, [elements underneath cursor]){}, // callback when the user drops an object in a new position
  });
</script>
```

**Context Menus**

The browser's native context menu will be suppressed by default since dragging with the right mouse button serves as a "pan" gesture. You can supply a callback for right-clicks, making it possible to create context-aware context menus for each individual element in your draggable interface. The HTML for your context menu should not be placed inside the makeItZoom container, since it will then be scaled. More likely, you will want to position the context menu absolutely at the screen position of the user's click. Here's an example:
*********