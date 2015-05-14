# makeItZoom.js
A JavaScript Framework that makes Zooming User Interfaces Easy

Web applications can now do real work, and frequently real work requires real estate. makeItZoom.js gives you infinite real estate for your web application, along with several tools that every serious web application will need at its core:

- Infinitely Zooming Workspace
- Drag and Drop Events
- CSS Styling Works like normal
- Native HTML controls
- Context Menu Customizations

It has no dependencies. To use it, just include the script at the top of your page:

***

You can specify the DOM element that will contain the zoomable interface, and the elements that will zoom. Use the classes "zoomContainer" and "makeItZoom" respectively, or specify your own during init. Here's some makeItZoom-able markup:

```
<div class="zoomContainer">
  <div class="box makeItZoom">This box will zoom</div>
  <div class="box makeItZoom">
    <div class="child">
      This box will zoom with its parent, but not separately
    </div>
  </div>
</div>
```

At the bottom of your page, initialize makeItZoom. Every configurable parameter has a default, so you can call simply makeItZoom(), but everything is configurable. Defaults are:

```
<script>
  makeItZoom({
    containerClass: "zoomContainer", // optional
    zoomableClass: "makeItZoom", // optional
    customContextMenuClass: "contextMenu", // if none specified, context menus are "off"
    contextMenuHandler: function(element){}, // when a user right-clicks or long-taps an item with the contextMenu class, this callback should return a dictionary of context options for that element eg: {"opt1": "Delete", "opt2": "Save", "opt3": "Print"}
    contextMenuSelectionHandler: function(element,selection){}, // When a user selects an option from a context menu
    suppressNativeContextMenu: false, // suppresses the browser's context menu even if no context menu callback is supplied
    zoomableDrag: function(element,startPosition){}, // callback when the user has started dragging a zoomable element to a new position. startPosition is given in world coordinates of an un-zoomed space
    zoomableDrop: function(element, endPosition, [elements underneath cursor]){}, // callback when the user drops an object in a new position
  });
<script>
```
