pc.script.attribute('textureAsset', 'asset', [], {
    type: 'texture',
    max: 1
});

pc.script.attribute('x', 'number');
pc.script.attribute('y', 'number');
pc.script.attribute('width', 'number');
pc.script.attribute('height', 'number');
pc.script.attribute('depth', 'number', 1)
pc.script.attribute('uPercentage', 'number', 1);
pc.script.attribute('vPercentage', 'number', 1);

pc.script.attribute('anchor', 'enumeration', 0, {
    enumerations: [{
        name: 'topLeft',
        value: 0
    }, {
        name: 'top',
        value: 1
    }, {
        name: 'topRight',
        value: 2
    }, {
        name: 'left',
        value: 3
    }, {
        name: 'center',
        value: 4
    }, {
        name: 'right',
        value: 5
    }, {
        name: 'bottomLeft',
        value: 6
    }, {
        name: 'bottom',
        value: 7
    }, {
        name: 'bottomRight',
        value: 8
    }]
});

pc.script.attribute('pivot', 'enumeration', 0, {
    enumerations: [{
        name: 'topLeft',
        value: 0
    }, {
        name: 'top',
        value: 1
    }, {
        name: 'topRight',
        value: 2
    }, {
        name: 'left',
        value: 3
    }, {
        name: 'center',
        value: 4
    }, {
        name: 'right',
        value: 5
    }, {
        name: 'bottomLeft',
        value: 6
    }, {
        name: 'bottom',
        value: 7
    }, {
        name: 'bottomRight',
        value: 8
    }]
});

pc.script.attribute('tint', 'rgba', [1,1,1,1]);

pc.script.attribute('maxResHeight', 'number', 720);

pc.script.create('sprite', function (app) {

    var shader = null;
    var vertexFormat = null;
    var resolution = new pc.Vec2();

    var Sprite = function (entity) {
        this.entity = entity;
    };

    Sprite.prototype = {
        initialize: function () {
           var canvas = document.getElementById('application-canvas');

            this.userOffset = new pc.Vec2();
            this.offset = new pc.Vec2();
            this.scaling = new pc.Vec2();
            this.anchorOffset = new pc.Vec2();
            this.pivotOffset = new pc.Vec2();

            // Create shader
            var gd = app.graphicsDevice;

            if (!shader) {
                var shaderDefinition = {
                    attributes: {
                        aPosition: pc.SEMANTIC_POSITION,
                        aUv0: pc.SEMANTIC_TEXCOORD0
                    },
                    vshader: [
                        "attribute vec2 aPosition;",
                        "attribute vec2 aUv0;",
                        "varying vec2 vUv0;",
                        "uniform vec2 uResolution;",
                        "uniform vec2 uOffset;",
                        "uniform vec2 uScale;",
                        "",
                        "void main(void)",
                        "{",
                        "    gl_Position = vec4(2.0 * ((uScale * aPosition.xy + uOffset) / uResolution ) - 1.0, -0.9, 1.0);",
                        "    vUv0 = aUv0;",
                        "}"
                    ].join("\n"),
                    fshader: [
                        "precision " + gd.precision + " float;",
                        "",
                        "varying vec2 vUv0;",
                        "",
                        "uniform vec4 vTint;",
                        "",
                        "uniform sampler2D uColorMap;",
                        "",
                        "void main(void)",
                        "{",
                        "    vec4 color = texture2D(uColorMap, vUv0);",
                        "    gl_FragColor = vec4(color.rgb * vTint.rgb, color.a * vTint.a);",
                        "}"
                    ].join("\n")
                };

                shader = new pc.Shader(gd, shaderDefinition);
            }


            // Create the vertex format
            if (!vertexFormat) {
                vertexFormat = new pc.VertexFormat(gd, [
                    { semantic: pc.SEMANTIC_POSITION, components: 2, type: pc.ELEMENTTYPE_FLOAT32 },
                    { semantic: pc.SEMANTIC_TEXCOORD0, components: 2, type: pc.ELEMENTTYPE_FLOAT32 }
                ]);
            }

            // Load the texture
            var asset = app.assets.get(this.textureAsset);
            asset.ready(function (asset) {
                this.texture = asset.resource;

                // Create a vertex buffer
                this.vertexBuffer = new pc.VertexBuffer(gd, vertexFormat, 6, pc.BUFFER_DYNAMIC);
                this.updateSprite();

                var command = new pc.Command(pc.LAYER_HUD, pc.BLEND_NORMAL, function () {
                    if (this.entity.enabled) {
                        // Set the shader
                        gd.setShader(shader);

                        gd.setBlending(true);
                        gd.setBlendFunction(pc.BLENDMODE_SRC_ALPHA, pc.BLENDMODE_ONE_MINUS_SRC_ALPHA);
                        gd.setDepthWrite(false);
                        gd.setDepthTest(false);

                        resolution.set(canvas.offsetWidth, canvas.offsetHeight);

                        gd.scope.resolve("uResolution").setValue(resolution.data);
                        gd.scope.resolve("uScale").setValue(this.calculateScaling().data);
                        gd.scope.resolve("uOffset").setValue(this.calculateOffset().data);
                        gd.scope.resolve("uColorMap").setValue(this.texture);
                        gd.scope.resolve("vTint").setValue(this.tint.data);

                        // Set the vertex buffer
                        gd.setVertexBuffer(this.vertexBuffer, 0);
                        gd.draw({
                            type: pc.PRIMITIVE_TRIANGLES,
                            base: 0,
                            count: 6,
                            indexed: false
                        });
                    }
                }.bind(this));

                this.command = command;
                command.key = this.depth;

                app.scene.drawCalls.push(command);
            }.bind(this));
            app.assets.load(asset);

            app.mouse.on('mousedown', this.onMouseDown, this);
            app.mouse.on('mouseup', this.onMouseUp, this);
            if (app.touch) {
                app.touch.on('touchstart', this.onTouchStart, this);
                app.touch.on('touchend', this.onTouchEnd, this);
            }
        },

        onMouseDown: function (e) {
            if (!this.eventsEnabled) {
                return;
            }
            
            this.clickReady = this.insideRect(e);
            if (this.clickReady) {
                this.fire('down');
            }
        },
        
        onMouseUp: function (e) {
            if (!this.eventsEnabled) {
                return;
            }
            
            if(this.clickReady) {
                this.onClick(e);
            }
            this.clickReady = false;
            this.fire('up');
        },

        onTouchStart: function (e) {
            if (!this.eventsEnabled) {
                return;
            }
            
            this.clickReady = this.insideRect(e.changedTouches[0]);
            if (this.clickReady) {
                this.fire('down');
            }
        },
        
        onTouchEnd: function (e) {
            if (!this.eventsEnabled) {
                return;
            }
            
            if(this.clickReady) {
                this.onClick(e.changedTouches[0]);
            }
            this.clickReady = false;
            this.fire('up');
        },

        /**
         * Calculates if the click has happened inside the rect of this
         * sprite
         */
        insideRect: function(cursor) {
            var canvas = app.graphicsDevice.canvas;
            var tlx, tly, brx, bry, mx, my;

            var scaling = this.scaling;
            var offset = this.offset;

            tlx = 2.0 * (scaling.x * 0 + offset.x) / resolution.x - 1.0;
            tly = 2.0 * (scaling.y * 0 + offset.y) / resolution.y - 1.0;


            brx = 2.0 * (scaling.x * this.width + offset.x) / resolution.x - 1.0;
            bry = 2.0 * (scaling.y * (- this.height) + offset.y) / resolution.y - 1.0;

            mx = (2.0 * cursor.x / canvas.offsetWidth) - 1;
            my = (2.0 * (canvas.offsetHeight - cursor.y) / canvas.offsetHeight) - 1;

            if (mx >= tlx && mx <= brx &&
                my <= tly && my >= bry) {
                return true;
            }
            return false;
        },
        
        /**
         *  Fires 'click' event if the click took place inside the sprite's rect
         */
        onClick: function (cursor) {
            if (this.insideRect(cursor)) {
                this.fire('click');
            }
        },

        onAttributeChanged: function (name, oldValue, newValue) {
            this.eventsEnabled = false;
            if (name === 'depth') {
                this.command.key = newValue;
            }
            else if (name === 'width' ||
                     name === 'height' ||
                     name === 'uPercentage' ||
                     name === 'vPercentage') {

                this.updateSprite();
            }
        },

        updateSprite: function () {
            if (!this.vertexBuffer) {
                return;
            }

            // Fill the vertex buffer
            this.vertexBuffer.lock();

            var canvas = app.graphicsDevice.canvas;

            // Add vertices
            var iterator = new pc.VertexIterator(this.vertexBuffer);
            iterator.element[pc.SEMANTIC_POSITION].set(0, -this.height);
            iterator.element[pc.SEMANTIC_TEXCOORD0].set(0, 0);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(this.width, -this.height);
            iterator.element[pc.SEMANTIC_TEXCOORD0].set(this.uPercentage, 0);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(0, 0);
            iterator.element[pc.SEMANTIC_TEXCOORD0].set(0, this.vPercentage);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(this.width, -this.height);
            iterator.element[pc.SEMANTIC_TEXCOORD0].set(this.uPercentage, 0);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(this.width, 0);
            iterator.element[pc.SEMANTIC_TEXCOORD0].set(this.uPercentage, this.vPercentage);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(0, 0);
            iterator.element[pc.SEMANTIC_TEXCOORD0].set(0, this.vPercentage);

            this.vertexBuffer.unlock();
        },

        calculateOffset: function () {
            var canvas = app.graphicsDevice.canvas;
            this.calculateAnchorOffset();
            this.calculatePivotOffset();

            this.offset.set(this.x * this.scaling.x, this.y * this.scaling.y)
            .add(this.userOffset)
            .add(this.anchorOffset)
            .add(this.pivotOffset);

            this.offset.y += canvas.offsetHeight;
            return this.offset;
        },

        calculateScaling: function () {
            var canvas = app.graphicsDevice.canvas;
            var scale = canvas.offsetHeight / this.maxResHeight;
            this.scaling.set(scale, scale);
            return this.scaling;
        },

        calculateAnchorOffset: function () {
            var canvas = app.graphicsDevice.canvas;
            var width = canvas.offsetWidth;
            var height = canvas.offsetHeight;

            switch (this.anchor) {
                // top left
                case 0:
                    this.anchorOffset.set(0,0);
                    break;
                // top
                case 1:
                    this.anchorOffset.set(width * 0.5, 0);
                    break;
                // top right
                case 2:
                    this.anchorOffset.set(width, 0);
                    break;
                // left
                case 3:
                    this.anchorOffset.set(0, -height * 0.5);
                    break;
                // center
                case 4:
                    this.anchorOffset.set(width * 0.5, -height * 0.5);
                    break;
                // right
                case 5:
                    this.anchorOffset.set(width, -height * 0.5);
                    break;
                // bottom left
                case 6:
                    this.anchorOffset.set(0, -height);
                    break;
                // bottom
                case 7:
                    this.anchorOffset.set(width/2, -height);
                    break;
                // bottom right
                case 8:
                    this.anchorOffset.set(width, -height);
                    break;
                default:
                    console.error('Wrong anchor: ' + this.anchor);
                    break;
            }

            return this.anchorOffset;
        },

        calculatePivotOffset: function () {
            var width = this.width * this.scaling.x;
            var height = this.height * this.scaling.y;

            switch (this.pivot) {
                // top left
                case 0:
                    this.pivotOffset.set(0,0);
                    break;
                // top
                case 1:
                    this.pivotOffset.set(-width * 0.5, 0);
                    break;
                // top right
                case 2:
                    this.pivotOffset.set(-width, 0);
                    break;
                // left
                case 3:
                    this.pivotOffset.set(0, height * 0.5);
                    break;
                // center
                case 4:
                    this.pivotOffset.set(-width * 0.5, height * 0.5);
                    break;
                // right
                case 5:
                    this.pivotOffset.set(-width, height * 0.5);
                    break;
                // bottom left
                case 6:
                    this.pivotOffset.set(0, height);
                    break;
                // bottom
                case 7:
                    this.pivotOffset.set(-width/2, height);
                    break;
                // bottom right
                case 8:
                    this.pivotOffset.set(-width, height);
                    break;
                default:
                    console.error('Wrong pivot: ' + this.pivot);
                    break;
            }

            return this.pivotOffset;
        },

        onEnable: function () {
            this.eventsEnabled = false;
        },

        onDisable: function () {
            this.eventsEnabled = false;
        },

        update: function (dt) {
            this.eventsEnabled = true;
        },

        destroy: function () {
            // remove draw call
            if (this.command) {
                var i = app.scene.drawCalls.indexOf(this.command);
                if (i >= 0) {
                    app.scene.drawCalls.splice(i, 1);
                }
            }
        }
    };

    return Sprite;
});
