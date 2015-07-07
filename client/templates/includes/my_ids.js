var PLACEHOLDER_TXT = "I identify with...";

Template.myIds.onRendered(function() {

  var margin,
    width,
    height,
    xPos,
    yPos,
    radius,
    placeHolderTxt,
    selectedNode,
    mousedownNode,
    mouseupNode,
    rootNode,
    force,
    drag,
    nodes,
    links,
    nodeElements,
    linkElements,
    svgViewport,
    svgCheckbox,
    isFixed,
    svgGroup,
    dragLine,
    resetMouseVars,
    drawLineToMousePosition,
    createNodeAtMousePosition,
    deselectCurrentNode,
    updateLayout,
    updateDOM,
    dragstart,
    dragmove,
    dragend,
    currentUser,
    currentTrainingId,
    currentAvatar
    ;

  margin = {
    top: 20,
    right: 10,
    bottom: 20,
    left: 10
  };

  width = 768 - margin.left - margin.right;
  height = 1024 - margin.top - margin.bottom;
  xPos = width / 2;
  yPos = height / 3 * 1.5;
  radius = 35;
  placeHolderTxt = PLACEHOLDER_TXT;
  isFixed = true;
  selectedNode = null;
  mousedownNode = null;
  mouseupNode = null;

  currentUser = Meteor.user();
  currentTrainingId = currentUser.profile.currentTraining;
  console.log("Template onRendered - current trainingId is: " + currentTrainingId);
  currentAvatar = Avatars.findOne({type: currentUser.profile.avatar});

  if (currentTrainingId && Identifications.find().count() === 0) {
    console.log("find count");
    rootNode = {
      level: 0,
      fixed: true,
      x: xPos,
      y: yPos,
      px: xPos,
      py: yPos,
      children: [],
      createdBy: currentUser._id,
      trainingId: currentTrainingId
    };

    Identifications.insert(rootNode, function(error, result) {
      if (error) {
        return throwError("Error: " + error.reason);
      }
    });
  }

  dragstart = function(d) {
    console.log("dragstart event ", d3.event);
    d3.select(this).classed("dragging", true);
    d3.event.sourceEvent.stopPropagation();
    force.stop();
  };

  dragmove = function(d) {
    console.log("dragmove event ", d3.event);
    console.log("d3.select(this) ", d3.select(this));
    console.log("d3.mouse(this) ", d3.mouse(this));
    var deltaX = d3.mouse(this)[0];
    var deltaY = d3.mouse(this)[1];
    Identifications.update(d._id, {
      $inc: {
        x: deltaX,
        y: deltaY}
    });
    Links.find({"source._id": d._id}).forEach(function(link) {
      Links.update(link._id,
        {$inc: {
          "source.x": deltaX,
          "source.y": deltaY
        }}, {multi: true}
      );
    });

    Links.find({"target._id": d._id}).forEach(function(link) {
      Links.update(link._id,
        {$inc: {
          "target.x": deltaX,
          "target.y": deltaY
        }}, {multi: true}
      );
    });

    // We handled this event here. No one else should see it no more.
    // d3.event.sourceEvent.stopPropagation();
  };

  dragend = function(d) {
    console.log("dragend event ", d3.event);
    d3.select(this).classed("dragging", false);
    // d.fixed = true;
    // updateDOM();
    // force.resume();
  };

  updateDOM = function () {
    linkElements.attr("x1", function(d) {
        return d.source.x;
      })
      .attr("y1", function(d) {
        return d.source.y;
      })
      .attr("x2", function(d) {
        return d.target.x;
      })
      .attr("y2", function(d) {
        return d.target.y;
      });

    nodeElements.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

  };

  resetMouseVars = function() {
    mousedownNode = null;
    mouseupNode = null;
  };

  // Handle the mousedown event for the outer svgGroup.
  deselectCurrentNode = function() {
    if (!mousedownNode) {
      selectNodeElement(null);
      resetMouseVars();
      // TODO(nz): Implement Zoom+Pan behavior
      return;
    }
  };

  // Handle the mousemove event for the outer svgGroup.
  drawLineToMousePosition = function() {
    // We do not want the dragLine to be drawn arbitrarily within the drawing surface.
    if (!mousedownNode) {
      return;
    }

    if (Session.equals("selectedElement", mousedownNode._id)) {
      selectNodeElement(null);
    }

    // We update the coordinates of the dragLine during mousemove to draw a line
    // from the mousedownNode to the current mouse position.
    dragLine
      .attr("class", "drag-line")
      .attr("x1", mousedownNode.x)
      .attr("y1", mousedownNode.y)
      .attr("x2", d3.mouse(this)[0])
      .attr("y2", d3.mouse(this)[1]);
  }; // end drawLineToMousePosition()

  // Handle the mouseup event for the outer svgGroup.
  createNodeAtMousePosition = function() {
    var newNodePos,
      node,
      newNodeId,
      link,
      newEditableElem
      ;

    // We are not on a node but on the drawing-surface so we want to
    // deselect the currently selected node and reset.
    if (!mousedownNode) {
      selectNodeElement(null);
      resetMouseVars();
      return;
    }

    // Hide the drag line since mousemove has finished.
    dragLine.attr("class", "drag-line-hidden");

    // Create a new node object with the current mouse position coordinates.
    newNodePos = d3.mouse(this);
    node = {
      level: mousedownNode.level + 1,
      fixed: isFixed,
      x: newNodePos[0],
      y: newNodePos[1],
      px: newNodePos[0],
      py: newNodePos[1],
      parentId: mousedownNode._id,
      children: [],
      name: placeHolderTxt,
      createdBy: currentUser._id,
      trainingId: currentTrainingId,
      editCompleted: false
    };

    // Add the new node to our 'Identifications' collection and
    // push the returned '_id' to its parent 'children' array.
    newNodeId = Identifications.insert(node, function(error, result) {
      if (error) {
        return throwError(error.reason);
      }
    });

    Identifications.update(node.parentId, {
      $push: {children: newNodeId}
    }, function(error, result) {
      if (error) {
        return throwError(error.reason);
      }
    });

    // Create a new link object for the edge between the mousedownNode and
    // the newly created node and add it to our 'Links' collection.
    link = {
      source: mousedownNode,
      target: Identifications.findOne({"_id": newNodeId})
    };
    Links.insert(link, function(error, result) {
      if (error) {
        return throwError(error.reason);
      }
    });

    // Set the new node as selectedNode.
    selectedNode = Identifications.findOne({"_id": newNodeId});
    selectNodeElement(selectedNode._id);

    console.log("mousedownNode, ", mousedownNode);
    console.log("selectedNode, ", selectedNode);

    resetMouseVars();

    updateLayout(Identifications.find().fetch(), Links.find().fetch());

    // Select the editable <p> element.
    newEditableElem = d3.selectAll(".node.child").filter(function(d) {
      return d && d._id === selectedNode._id;
    }).select("p.txt-input").node();

    // Give the <p> element instant focus.
    newEditableElem.focus();

    /**
     * We want to select all of the text content within the currently active editable element
     * to allow for instant text entering. The default text selection color is customized
     * via CSS pseudo-element ::selection (@see CSS file)
     * cf. https://developer.mozilla.org/en-US/docs/Web/API/document/execCommand [as of 2015-02-25]
     */
    document.execCommand("selectAll", false, null);
  }; // end createNodeAtMousePosition()


  updateLayout = function(idsCollection, linksCollection) {
    var nodeEnterGroup,
        avatarSize,
        nodeControls,
        dragIcon,
        deleteIcon,
        iconRadius,
        dashedRadius;

    iconRadius = 15;
    dashedRadius = 40;
    avatarSize = 150;

    nodes = idsCollection;
    links = linksCollection;

    // We produce our D3 'update selection' (i.e. the result of the 'data()' operator).
    // 'linkElements' represents all the selected DOM elements (here: <g.link>) bound to the
    // specified data elements (i.e. the 'links' array).
    linkElements = linkElements.data(links, function(d) {
      return d.source._id + "-" + d.target._id;
    });

    // We operate on our 'update selection' to determine the exiting elements, i.e. all the
    // present DOM elements (here: <g.link>) for which no new data point was found in our
    // 'links' array.
    linkElements.exit().remove();

    // We operate on our 'update selection' to determine the entering elements, i.e. the
    // elements that we want to insert into the DOM according to each data point in our
    // 'links' array for which no corresponding DOM element was found in our current selection.
    linkElements.enter().insert("line", ".node")
      .attr("class", "link")
      .attr("x1", function(d) {
        return d.source.x;
      })
      .attr("y1", function(d) {
        return d.source.y;
      })
      .attr("x2", function(d) {
        return d.target.x;
      })
      .attr("y2", function(d) {
        return d.target.y;
      });

    // We produce our D3 'update selection' (i.e. the result of the 'data()' operator).
    // 'nodeElements' represents all the selected DOM elements (here: <g.node>) bound to the
    // specified data elements (i.e. the 'nodes' array).
    nodeElements = nodeElements.data(nodes, function(d, i) {
      return d._id;
    });

    nodeElements.classed("node-selected", function(d) {
      return Session.equals("selectedElement", d._id);
    });

    // We operate on our 'update selection' to determine the exiting elements, i.e. all the
    // present DOM elements (here: <g.node>) for which no new data point was found in our
    // 'nodes' array.
    nodeElements.exit().remove();

    // We produce our D3 'enter selection'.
    // 'nodeEnterGroup' represents the entering elements, i.e. the elements that we want to
    // append to the DOM according to each data point in our 'nodes' array for which no
    // corresponding DOM element was found in our current selection.
    nodeEnterGroup = nodeElements.enter().append("g")
      .attr("id", function(d) {
        // We need to prefix the value that is assigned to the 'id' attribute
        // in order to prevent an invalid 'querySelector' which will be the case
        // if the value happens to start with a numeric character.
        // So we use the prefix 'gid' ('gid' as in 'group identifier').
        return "gid" + d._id;
      })
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + d.x + ", " + d.y + ")";
      })
      .classed({
        "root": function(d) {
          return d._id && d.level === 0;
        },
        "child": function(d) {
          return d._id && d.level > 0;
        },
        "node-selected": function(d) {
          return Session.equals("selectedElement", d._id);
        }
      });

    // TEST circle for checking transfoms
    // nodeEnterGroup.append("circle")
    //   .attr("r", 10)
    //   .style("fill", "green");

    nodeEnterGroup.append(function(d) {
      var avatarIcon,
        filledCircle
        ;

      if (d.level === 0) {
        avatarIcon = document.createElementNS(d3.ns.prefix.svg, "use");
        avatarIcon.setAttributeNS(d3.ns.prefix.xlink, "xlink:href", currentAvatar.url);
        avatarIcon.setAttribute("width", avatarSize);
        avatarIcon.setAttribute("height", avatarSize);
        avatarIcon.setAttribute("transform", "translate(" + (-avatarSize/2) + ","  +(-avatarSize/2) + ")");
        return avatarIcon;
      }

      filledCircle = document.createElementNS(d3.ns.prefix.svg, "circle");
      filledCircle.setAttribute("r", radius);
      filledCircle.setAttribute("class", "filled");
      return filledCircle;
    });


    nodeEnterGroup.insert("circle", ".filled")
      .attr("r", dashedRadius)
      .attr("class", "dashed");


    nodeEnterGroup.append(function(d) {
      var svgText,
        svgForeignObject,
        htmlParagraph
        ;

      if (d.level === 0) {
        svgText = document.createElementNS(d3.ns.prefix.svg, "text");
        svgText.setAttribute("text-anchor", "middle");
        svgText.textContent = currentUser.profile.name;
        svgText.setAttribute("transform", "translate(0," + (avatarSize/2 + 5) +")");
        return svgText;
      }
      /**
       * HEADS UP: Chrome will ignore the camelCase naming of SVG <foreignObject> elements
       * and instead renders an lower case tagname <foreignobject>.
       * So we apply a class "foreign-object" to be used as selector if needed.
       * cf. http://bl.ocks.org/jebeck/10699411 [as of 2015-02-23]
       */
      svgForeignObject = document.createElementNS(d3.ns.prefix.svg, "foreignObject");
      svgForeignObject.setAttribute("class", "foreign-object");
      svgForeignObject.setAttribute("width", radius * 2);
      svgForeignObject.setAttribute("height", radius * 2);
      svgForeignObject.setAttribute("transform", "translate(" + (-radius) + ", " + (-radius) + ")");
      htmlParagraph = document.createElementNS(d3.ns.prefix.xhtml, "p");
      htmlParagraph.setAttribute("class", "txt-input");
      htmlParagraph.setAttribute("contentEditable", true);
      htmlParagraph.textContent = d.name;
      svgForeignObject.appendChild(htmlParagraph);

      return svgForeignObject;
    });

    nodeEnterGroup
      .on("mousedown", function(d) {
        d3.event.stopPropagation();
        mousedownNode = d;

        if (d3.event.shiftKey) {

          // TODO implement custom drag behaviour using shiftKey or longclick to discriminate
          // between regular mousedown and the creatiion of new nodes
          d3.select(this)
            .on("mousemove", dragmove);

        } else {

          // We need to ensure that the user enters some text before he or she may
          // continue to create other identification bubbles.
          if (mousedownNode.name === placeHolderTxt || mousedownNode.name === "") {
            d3.select("#ids-vis g")
              .on("mousemove", null)
              .on("mouseup", null);
            return d3.select(this).classed("node-empty", true);
          } else {
            d3.select("#ids-vis g")
              .on("mousemove", drawLineToMousePosition)
              .on("mouseup", createNodeAtMousePosition);
          }
        }
        selectNodeElement(mousedownNode._id);
      })
      .on("mouseup", function(d) { // mouseup on a Böbbel
        d3.event.stopPropagation();
        mouseupNode = d;

        // TODO implement custom drag behaviour using shiftKey or longclick
        if (d3.event.shiftKey) {
          console.log("mouseup shiftKey");

        } else {

            if (!mousedownNode || mouseupNode._id === mousedownNode._id) {
              resetMouseVars();
              return;
            }

        }
      })
      .on("keydown", function(d) {
        d3.event.stopPropagation();

        if (d.level > 0) {
          var newName,
            inputTxt;

          inputTxt = d3.select(this).select("p.txt-input");
          newName = inputTxt.text();

          // When the user hits 'ENTER' we need to ensure that the user did not
          // leave the input empty and if so, we will display a message to the user
          // and stop executing the event handling. Otherwise, we update the
          // 'editCompleted' field of the current document in the 'Identifications'
          // collection and deselect the node element.
          // The 'editCompleted' field allows for database queries only for documents
          // that a user has finished editing.
          if (d3.event.keyCode === 13) {
            d3.event.preventDefault();
            if (newName === placeHolderTxt || newName === "") {
              return d3.select(this).classed("node-empty", true);
            }
            Identifications.update(d._id, {
              $set: {
                name: newName,
                editCompleted: true}
            });
            inputTxt.node().blur();
            selectNodeElement(null);
          } else {
            // While the user types, we update the current document.
            Identifications.update(d._id, {
              $set: {
                name: newName,
                editCompleted: false
              }
            });
          }
        }
        // We use 'return' here to abort listening to this event on root level
        return;
      })
      .on("dblclick", function(d) {
        if (d.level > 0) {
          d3.select(this).select("p.txt-input").node().focus();
          document.execCommand("selectAll", false, null);
        }
      });

      nodeControls = nodeEnterGroup.append("g")
        .attr("class", "selected-controls");

      dragIcon = nodeControls.append("g")
        .attr("transform", "translate(" + (-dashedRadius - 30) + "," + (-dashedRadius) + ")")
        .attr("class", "drag-icon");

      dragIcon.append("use")
        .attr("xlink:href", "svg/icons.svg#drag-icon");

      deleteIcon = nodeControls.append("g")
        .attr("transform", "translate(" + (dashedRadius) + "," + (-dashedRadius) + ")")
        .attr("class", "delete-icon")
        .on("mousedown", function(d) {
          d3.event.stopPropagation();
          deleteNodeAndLink("selectedElement");
        });

      deleteIcon.append("use")
        .attr("xlink:href", "svg/icons.svg#delete-icon");

    if (d3.event) {
      // Prevent browser's default behavior
      console.log("d3.event >> " , d3.event);
      d3.event.preventDefault();
    }

    force.start();
  }; // end updateLayout() function


  /**
   * Creates the force layout object and sets some configuration properties.
   * On initialization the layout's associated nodes will be set to the rood node while
   * the layout's associated links will be initialized with an empty array.
   */
  force = d3.layout.force()
    .size([width, height])
    .nodes(Identifications.find().fetch())
    .links(Links.find().fetch())
    .linkDistance(function(d) {
      return 250 / (d.source.level + 1) + radius;
    })
    .linkStrength(0.2)
    .charge(-6000)
    .gravity(0) // A value of 0 disables gravity.
    .friction(0.01) // Slows the layout down at eacht iteration.
    .on("tick", updateDOM); // Calls the updateDOM() function on each iteration step.

  // drag = d3.behavior.drag()
  //   .origin(function(d) { return {x: 0, y: 0};  })
  //   .on("dragstart", dragstart)
  //   .on("drag", dragmove)
  //   .on("dragend", dragend);

  // Create the SVG element
  svgViewport = d3.select("#ids-graph").append("svg")
    .attr("id", "ids-vis")
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    .attr("preserveAspectRatio", "xMidYMid meet");

  svgGroup = svgViewport.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .on("mousedown", deselectCurrentNode);

  svgGroup.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "drawing-surface");

  // Line displayed when dragging new nodes
  dragLine = svgGroup.append("line")
    .attr("class", "drag-line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 0);


  // We declare a 'Tracker.autorun' block to monitor the reactive data sources
  // represented by the cursors resulting from querying our Mongo collections.
  // If the result of our collection query changes, the function will re-run.
  Tracker.autorun(function() {
    var identifications,
      fromTo;

    identifications = Identifications.find().fetch();
    fromTo = Links.find().fetch();
    nodeElements = svgGroup.selectAll(".node");
    linkElements = svgGroup.selectAll(".link");
    updateLayout(identifications, fromTo);
  });

});

Template.myIds.onDestroyed(function() {
  // TODO stop autorun
});


/**
 * Selects (or deselects) a node element (i.e. an identification circle).
 * If the node is a newly created identification circle it gets selected immediately.
 * All the other nodes are selectable by user interaction.
 * We use a Session variable to detect selected or deselected state, respectively.
 * Depending on that, we update the current document's 'editCompleted' field and we
 * also apply a CSS class, which in turn toggles the control handles for
 * dragging or deleting a circle.
 * @param {string} elementId The (database document) id of the node.
 */
function selectNodeElement(elementId) {
  var selectedElement = Session.get("selectedElement"),
    nodeName;
  if (elementId === selectedElement) {
    return;
  }
  if (selectedElement) {
    nodeName = Identifications.findOne(selectedElement).name;
    if (nodeName === PLACEHOLDER_TXT || nodeName === "") {
      d3.select("#ids-vis g")
        .on("mousemove", null)
        .on("mouseup", null);
      return d3.select("#gid" + selectedElement).classed("node-empty", true);
    }
    Identifications.update(selectedElement, {
      $set: {editCompleted: true}
    });
    d3.select("#gid" + selectedElement).classed({
      "node-selected": false,
      "node-empty": false
    });
  }
  if (elementId) {
    Identifications.update(elementId, {
      $set: {editCompleted: false}
    });
    d3.select("#gid" + elementId).classed("node-selected", true);
  }
  Session.set("selectedElement", elementId);
}

/**
 * Deletes a node document (i.e. an identification document) and its associated
 * link documents from the respective collection.
 * Since we call this function from inside different event handlers we use a
 * session key to set the variable in the session.
 * @param {string} sessionKey The key of the session variable to set.
 */
function deleteNodeAndLink(sessionKey) {
  var nodeId,
    nodeDoc;

  nodeId = Session.get(sessionKey);

  if (nodeId) {
    nodeDoc = Identifications.findOne(nodeId);
    if (nodeDoc.children.length) {
      return throwError("You can not remove an identification bubble with attached child-bubbles.");
    }
    Links.remove(Links.findOne({"target._id": nodeId})._id, function(error, result){
      if (error) {
        return throwError(error.reason);
      }
    });
    Identifications.remove(nodeId, function(error, result){
      if (error) {
        return throwError(error.reason);
      }
    });
    Identifications.update(nodeDoc.parentId, {
      $pull: {children: nodeId}
    }, function(error, result) {
      if (error) {
        return throwError(error.reason);
      }
    });
    Session.set(sessionKey, null);
  }
}
