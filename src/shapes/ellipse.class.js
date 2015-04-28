(function(global) {

  'use strict';

  var fabric = global.fabric || (global.fabric = { }),
      piBy2   = Math.PI * 2,
      extend = fabric.util.object.extend;

  if (fabric.Ellipse) {
    fabric.warn('fabric.Ellipse is already defined.');
    return;
  }

  /**
   * Ellipse class
   * @class fabric.Ellipse
   * @extends fabric.Object
   * @return {fabric.Ellipse} thisArg
   * @see {@link fabric.Ellipse#initialize} for constructor definition
   */
  fabric.Ellipse = fabric.util.createClass(fabric.Object, /** @lends fabric.Ellipse.prototype */ {

    /**
     * Type of an object
     * @type String
     * @default
     */
    type: 'ellipse',

    /**
     * Horizontal radius
     * @type Number
     * @default
     */
    rx:   0,

    /**
     * Vertical radius
     * @type Number
     * @default
     */
    ry:   0,

    /**
     * When false, the stroke will always drawn the same width, regardless of scaleX and scaleY.
     * @type Boolean
     * @default
     */
    transformStrokeAndFill: true,

    /**
     * Constructor
     * @param {Object} [options] Options object
     * @return {fabric.Ellipse} thisArg
     */
    initialize: function(options) {
      options = options || { };

      this.callSuper('initialize', options);

      this.set('rx', options.rx || 0);
      this.set('ry', options.ry || 0);
    },

    /**
     * @private
     * @param {String} key
     * @param {Any} value
     * @return {fabric.Ellipse} thisArg
     */
    _set: function(key, value) {
      this.callSuper('_set', key, value);
      switch (key) {

        case 'rx':
          this.rx = value;
          this.set('width', value * 2);
          break;

        case 'ry':
          this.ry = value;
          this.set('height', value * 2);
          break;

      }
      return this;
    },

    /**
     * Returns horizontal radius of an object (according to how an object is scaled)
     * @return {Number}
     */
    getRx: function() {
      return this.get('rx') * this.get('scaleX');
    },

    /**
     * Returns Vertical radius of an object (according to how an object is scaled)
     * @return {Number}
     */
    getRy: function() {
      return this.get('ry') * this.get('scaleY');
    },

    /**
     * Returns object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} object representation of an instance
     */
    toObject: function(propertiesToInclude) {
      return extend(this.callSuper('toObject', propertiesToInclude), {
        rx: this.get('rx'),
        ry: this.get('ry')
      });
    },

    /* _TO_SVG_START_ */
    /**
     * Returns svg representation of an instance
     * @param {Function} [reviver] Method for further parsing of svg representation.
     * @return {String} svg representation of an instance
     */
    toSVG: function(reviver) {
      var markup = this._createBaseSVGMarkup(), x = 0, y = 0;
      if (this.group && this.group.type === 'path-group') {
        x = this.left + this.rx;
        y = this.top + this.ry;
      }
      markup.push(
        '<ellipse ',
          'cx="', x, '" cy="', y, '" ',
          'rx="', this.rx,
          '" ry="', this.ry,
          '" style="', this.getSvgStyles(),
          '" transform="', this.getSvgTransform(),
          this.getSvgTransformMatrix(),
        '"/>\n'
      );

      return reviver ? reviver(markup.join('')) : markup.join('');
    },
    /* _TO_SVG_END_ */

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx context to render on
     * @param {Boolean} [noTransform] When true, context is not transformed
     */
    _createPath: function(ctx, noTransform) {
      ctx.beginPath();
      ctx.save();
      ctx.transform(1, 0, 0, this.ry/this.rx, 0, 0);
      ctx.arc(
        noTransform ? this.left + this.rx : 0,
        noTransform ? (this.top + this.ry) * this.rx/this.ry : 0,
        this.rx,
        0,
        piBy2,
        false);
      ctx.restore();
    },

    _renderCurrentPath: function(ctx) {
      this._renderFill(ctx);
      this._renderStroke(ctx);
    },

    /**
     * Renders an object on a specified context
     * @param {CanvasRenderingContext2D} ctx Context to render on
     * @param {Boolean} [noTransform] When true, context is not transformed
     */
    render: function(ctx, noTransform) {
      // do not render if width/height are zeros or object is not visible
      if (this.width === 0 || this.height === 0 || !this.visible) {
        return;
      }

      ctx.save();

      !this.transformStrokeAndFill && ctx.save();
      if (!noTransform) {
        this.transform(ctx);
      }
      if (this.transformMatrix) {
        ctx.transform.apply(ctx, this.transformMatrix);
      }
      this._createPath(ctx, noTransform);
      !this.transformStrokeAndFill && ctx.restore();

      // Pop contexts to remove scaling applied by the PathGroup
      if (!this.transformStrokeAndFill && this.group && this.group.type === 'path-group') {
        ctx.restore();  // ctx.save at the top of this function.
        ctx.restore();  // ctx.save in PathGroup - we're not distorted now. PathGroup has been hacked to expect this.
        ctx.save();     // Make a new context so PathGroup has something to restore.
        ctx.save();     // Emulate ctx.save at the top of this function
      }

      this._setupCompositeOperation(ctx);
      this._setStrokeStyles(ctx);
      this._setFillStyles(ctx);
      this._setOpacity(ctx);
      this._setShadow(ctx);
      this.clipTo && fabric.util.clipContext(this, ctx);
      this._renderCurrentPath(ctx);
      this.clipTo && ctx.restore();
      this._removeShadow(ctx);
      this._restoreCompositeOperation(ctx);

      ctx.restore();
    },

    /**
     * Returns complexity of an instance
     * @return {Number} complexity
     */
    complexity: function() {
      return 1;
    },

    //Returns true if there exists a visible part of this ellipse that clips with the rectangle
    //The rectangle is specified in canvas-relative coordinates, with x/y describing the top-left
    //of the rect.
    //True if:
    //All four corners of rect are inside the ellipse, and the fill is not transparent
    //Between 1 and 3 corners of the rect are inside the ellipse
    //There exists a pair of corners of the rect which are in different quadrants & the line between
    //them goes through the ellipse
    //The ellipse's bounding box is completley contained by the rect
    visibleAreaClipsWithRect: function(pointTL, pointTR) {
      var rect = {
        x: pointTL.x,
        y: pointTL.y,
        width: pointTR.x - pointTL.x,
        height: pointTR.y - pointTL.y,
      };
      /*var localPoints = {
        topLeft: new fabric.Point(rect.x, rect.y),
        topRight: new fabric.Point(rect.x + rect.width, rect.y),
        bottomLeft: new fabric.Point(rect.x, rect.y + rect.height),
        bottomRight: new fabric.Point(rect.x + rect.width, rect.y + rect.height),
      };
      if (this.group) {
        localPoints.topLeft = this.group.toLocalPoint(localPoints.topLeft, 'center', 'center');
        localPoints.topRight = this.group.toLocalPoint(localPoints.topRight, 'center', 'center');
        localPoints.bottomLeft = this.group.toLocalPoint(localPoints.bottomLeft, 'center', 'center');
        localPoints.bottomRight = this.group.toLocalPoint(localPoints.bottomL)
      }*/
      var localPoints = {
        topLeft: this.toLocalPointIncludingGroup(new fabric.Point(rect.x, rect.y), 'center', 'center'),
        topRight: this.toLocalPointIncludingGroup(new fabric.Point(rect.x + rect.width, rect.y), 'center', 'center'),
        bottomLeft: this.toLocalPointIncludingGroup(new fabric.Point(rect.x, rect.y + rect.height), 'center', 'center'),
        bottomRight: this.toLocalPointIncludingGroup(new fabric.Point(rect.x + rect.width, rect.y + rect.height), 'center', 'center'),
      };
      if (this.group) {

      }
      console.log('rect', rect);
      console.log('localPoints', localPoints);
      var pointIsInEllipse = function(point) {
        //(x/a)^2 + (y/b)^2 <= 1, the general ellipse equation
        var is = Math.pow(point.x /this.rx, 2) + Math.pow(point.y / this.ry, 2) <= 1;
        console.log('is', point.x, point.y, 'in ellipse?', is);
        return is;
      }.bind(this);
      var sign = function(val) {
        if (val === 0) {
          return 0;
        } else {
          return val > 0 ? 1 : -1;
        }
      };
      var verticalOrHorizontalLineIntersectsEllipse = function(p1, p2) {
        if (p1.x === p2.x) {
          //vertical line
          return p1.x <= this.width / 2 && p1.y >= -this.width / 2 && sign(p1.y) !== sign(p2.y);
        } else {
          //horizontal line
          return p1.y <= this.height / 2 && p1.y >= -this.height / 2 && sign(p1.x) !== sign(p2.x);
        }
      }.bind(this);

      var localPointArray = [localPoints.topLeft, localPoints.topRight, localPoints.bottomLeft, localPoints.bottomRight];
      var numPointsInEllipse = 0;
      localPointArray.forEach(function(point){
        if (pointIsInEllipse(point)) {
          point.isInEllipse = true;
          numPointsInEllipse++;
        }
      });

      if (numPointsInEllipse >= 1 && numPointsInEllipse <= 3) {
        return true;
      } else if (numPointsInEllipse === 4) {
        return !!this.fill; //return true as long as we're not transparent
      } else {
        //No point inside the ellipse.
        if (this.isContainedWithinRect(pointTL, pointTR)) {
          return true;
        } else {
          return verticalOrHorizontalLineIntersectsEllipse(localPoints.topLeft, localPoints.topRight) ||
            verticalOrHorizontalLineIntersectsEllipse(localPoints.topRight, localPoints.bottomRight) ||
            verticalOrHorizontalLineIntersectsEllipse(localPoints.bottomRight, localPoints.bottomLeft) ||
            verticalOrHorizontalLineIntersectsEllipse(localPoints.bottomLeft, localPoints.topLeft);
        }
      }
    },
  });

  /* _FROM_SVG_START_ */
  /**
   * List of attribute names to account for when parsing SVG element (used by {@link fabric.Ellipse.fromElement})
   * @static
   * @memberOf fabric.Ellipse
   * @see http://www.w3.org/TR/SVG/shapes.html#EllipseElement
   */
  fabric.Ellipse.ATTRIBUTE_NAMES = fabric.SHARED_ATTRIBUTES.concat('cx cy rx ry'.split(' '));

  /**
   * Returns {@link fabric.Ellipse} instance from an SVG element
   * @static
   * @memberOf fabric.Ellipse
   * @param {SVGElement} element Element to parse
   * @param {Object} [options] Options object
   * @return {fabric.Ellipse}
   */
  fabric.Ellipse.fromElement = function(element, options) {
    options || (options = { });

    var parsedAttributes = fabric.parseAttributes(element, fabric.Ellipse.ATTRIBUTE_NAMES);

    parsedAttributes.left = parsedAttributes.left || 0;
    parsedAttributes.top = parsedAttributes.top || 0;

    var ellipse = new fabric.Ellipse(extend(parsedAttributes, options));

    ellipse.top -= ellipse.ry;
    ellipse.left -= ellipse.rx;
    return ellipse;
  };
  /* _FROM_SVG_END_ */

  /**
   * Returns {@link fabric.Ellipse} instance from an object representation
   * @static
   * @memberOf fabric.Ellipse
   * @param {Object} object Object to create an instance from
   * @return {fabric.Ellipse}
   */
  fabric.Ellipse.fromObject = function(object) {
    return new fabric.Ellipse(object);
  };

})(typeof exports !== 'undefined' ? exports : this);
