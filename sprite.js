var Sprite = pc.createScript('sprite');

/**
 * Attributes
 */

Sprite.attributes.add('textureAsset', {
    type: 'asset',
    assetType: 'texture',
    description: 'The sprite texture'
});

Sprite.attributes.add('pos', {
    type: 'vec2',
    description: 'The coordinate in pixels',
    placeholder: [ 'x', 'y' ]
});

Sprite.attributes.add('size', {
    type: 'vec2',
    description: 'The size of sprite in pixels',
    placeholder: [ 'w', 'h' ],
    default: [ 128, 128 ]
});

Sprite.attributes.add('depth', {
    type: 'number',
    description: 'The z depth of the sprite compared to other sprites',
    default: 1
});

Sprite.attributes.add('uPercentage', {
    type: 'number',
    description: 'The horizontal texture percentage that is visible (used for progress bars)',
    default: 1,
    min: 0,
    max: 1
});

Sprite.attributes.add('vPercentage', {
    type: 'number',
    description: 'The vertical texture percentage that is visible (used for progress bars)',
    default: 1,
    min: 0,
    max: 1
});

Sprite.attributes.add('anchor', {
    type: 'number',
    default: 0,
    description: 'The anchor of the sprite related to the screen bounds',
    enum: [
        {'topLeft': 0},
        {'top': 1},
        {'topRight': 2},
        {'left': 3},
        {'center': 4},
        {'right': 5},
        {'bottomLeft': 6},
        {'bottom': 7},
        {'bottomRight': 8}
    ]
});

Sprite.attributes.add('pivot', {
    type: 'number',
    default: 0,
    description: 'The pivot point of the sprite',
    enum: [
        {'topLeft': 0},
        {'top': 1},
        {'topRight': 2},
        {'left': 3},
        {'center': 4},
        {'right': 5},
        {'bottomLeft': 6},
        {'bottom': 7},
        {'bottomRight': 8}
    ]
});


Sprite.attributes.add('tint', {
    type: 'rgba',
    description: 'A color that is multiplied with the current color of the sprite',
    default: [1,1,1,1]
});

Sprite.attributes.add('maxResHeight', {
    type: 'number',
    default: 720,
    description: 'The maximum resolution height of the application. Used to scale the sprite accordingly.'
});

/**
 * Static variables
 */
Sprite.material = null;
Sprite.vertexFormat = null;
Sprite.resolution = new pc.Vec2();


// initialize code called once per entity
Sprite.prototype.initialize = function() {
    var canvas = document.getElementById('application-canvas');

    this.userOffset = new pc.Vec2();
    this.offset = new pc.Vec2();
    this.scaling = new pc.Vec2();
    this.anchorOffset = new pc.Vec2();
    this.pivotOffset = new pc.Vec2();

    var app = this.app;

    // Create shader
    var gd = app.graphicsDevice;

    // Create material and shader
    if (! Sprite.material) {
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

        var shader = new pc.Shader(gd, shaderDefinition);

        var material = new pc.Material();
        material.shader = shader;
        material.blend = true;
        material.blendSrc = pc.BLENDMODE_SRC_ALPHA;
        material.blendDst = pc.BLENDMODE_ONE_MINUS_SRC_ALPHA;
        material.depthTest = false;
        material.depthWrite = false;
        Sprite.material = material;
    }

    // Create the vertex format
    if (!Sprite.vertexFormat) {
        Sprite.vertexFormat = new pc.VertexFormat(gd, [
            { semantic: pc.SEMANTIC_POSITION, components: 2, type: pc.ELEMENTTYPE_FLOAT32 },
            { semantic: pc.SEMANTIC_TEXCOORD0, components: 2, type: pc.ELEMENTTYPE_FLOAT32 }
        ]);
    }

    // Create mesh
    var mesh = new pc.Mesh();
    mesh.vertexBuffer = new pc.VertexBuffer(gd, Sprite.vertexFormat, 6, pc.BUFFER_DYNAMIC);
    mesh.primitive[0].type = pc.PRIMITIVE_TRIANGLES;
    mesh.primitive[0].base = 0;
    mesh.primitive[0].count = 6;
    mesh.primitive[0].indexed = false;

    // Create mesh instance
    this.meshInstance = new pc.MeshInstance(this.entity, mesh, Sprite.material);
    this.meshInstance.castShadow = false;
    this.meshInstance.receiveShadow = false;
    this.meshInstance.drawOrder = this.depth;

    this.texture = this.textureAsset.resource;

    // Create a vertex buffer
    this.updateSprite();

    // Get layer
    this.layer = app.scene.layers.getLayerById(pc.LAYERID_UI) || app.scene.layers.getLayerById(pc.LAYERID_WORLD);

    app.mouse.on('mousedown', this.onMouseDown, this);
    if (app.touch) {
        app.touch.on('touchstart', this.onTouchDown, this);
    }

    this.on('state', this.onState);
    this.on('destroy', this.onDestroy, this);
    this.on('attr:depth', function(value) {
        this.eventsEnabled = false;
        this.meshInstance.drawOrder = value;
    });
    this.on('attr:size', this.updateSprite);
    this.on('attr:uPercentage', this.updateSprite);
    this.on('attr:vPercentage', this.updateSprite);

    this.onState(true);
};

Sprite.prototype.onMouseDown = function (e) {
    if (!this.eventsEnabled) {
        return;
    }

    this.onClick(e);
};

Sprite.prototype.onTouchDown = function (e) {
    if (!this.eventsEnabled) {
        return;
    }

    this.onClick(e.changedTouches[0]);
};

/**
 * Calculates if the click has happened inside the rect of this
 * sprite and fires 'click' event if it has
 */
Sprite.prototype.onClick = function (cursor) {
    var canvas = this.app.graphicsDevice.canvas;
    var tlx, tly, brx, bry, mx, my;


    var scaling = this.scaling;
    var offset = this.offset;

    tlx = 2.0 * (scaling.x * 0 + offset.x) / Sprite.resolution.x - 1.0;
    tly = 2.0 * (scaling.y * 0 + offset.y) / Sprite.resolution.y - 1.0;


    brx = 2.0 * (scaling.x * this.size.x + offset.x) / Sprite.resolution.x - 1.0;
    bry = 2.0 * (scaling.y * (- this.size.y) + offset.y) / Sprite.resolution.y - 1.0;

    mx = (2.0 * cursor.x / canvas.offsetWidth) - 1;
    my = (2.0 * (canvas.offsetHeight - cursor.y) / canvas.offsetHeight) - 1;

    if (mx >= tlx && mx <= brx &&
        my <= tly && my >= bry) {
        this.fire('click');
    }
};

Sprite.prototype.updateSprite = function () {
    if (!this.meshInstance) {
        return;
    }

    this.eventsEnabled = false;

    // Fill the vertex buffer
    var vb = this.meshInstance.mesh.vertexBuffer;
    vb.lock();

    var canvas = this.app.graphicsDevice.canvas;

    // Add vertices
    var iterator = new pc.VertexIterator(vb);
    iterator.element[pc.SEMANTIC_POSITION].set(0, -this.size.y);
    iterator.element[pc.SEMANTIC_TEXCOORD0].set(0, 0);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(this.size.x, -this.size.y);
    iterator.element[pc.SEMANTIC_TEXCOORD0].set(this.uPercentage, 0);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(0, 0);
    iterator.element[pc.SEMANTIC_TEXCOORD0].set(0, this.vPercentage);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(this.size.x, -this.size.y);
    iterator.element[pc.SEMANTIC_TEXCOORD0].set(this.uPercentage, 0);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(this.size.x, 0);
    iterator.element[pc.SEMANTIC_TEXCOORD0].set(this.uPercentage, this.vPercentage);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(0, 0);
    iterator.element[pc.SEMANTIC_TEXCOORD0].set(0, this.vPercentage);

    vb.unlock();
};

Sprite.prototype.calculateOffset = function () {
    var canvas = this.app.graphicsDevice.canvas;
    this.calculateAnchorOffset();
    this.calculatePivotOffset();

    this.offset.set(this.pos.x * this.scaling.x, this.pos.y * this.scaling.y)
    .add(this.userOffset)
    .add(this.anchorOffset)
    .add(this.pivotOffset);

    this.offset.y += canvas.offsetHeight;
    return this.offset;
};

Sprite.prototype.calculateScaling = function () {
    var canvas = this.app.graphicsDevice.canvas;
    var scale = canvas.offsetHeight / this.maxResHeight;
    this.scaling.set(scale, scale);
    return this.scaling;
};

Sprite.prototype.calculateAnchorOffset = function () {
    var canvas = this.app.graphicsDevice.canvas;
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
};

Sprite.prototype.calculatePivotOffset = function () {
    var width = this.size.x * this.scaling.x;
    var height = this.size.y * this.scaling.y;

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
};

Sprite.prototype.onState = function(enabled) {
    this.eventsEnabled = false;

    if (this.layer) {
        if (enabled) {
            this.layer.addMeshInstances([this.meshInstance]);
        } else {
            this.layer.removeMeshInstances([this.meshInstance]);
        }
    }

};

Sprite.prototype.update = function (dt) {
    this.eventsEnabled = true;
    var canvas = this.app.graphicsDevice.canvas;
    Sprite.resolution.set(canvas.offsetWidth, canvas.offsetHeight);
    this.meshInstance.setParameter('uResolution', Sprite.resolution.data);
    this.meshInstance.setParameter('uScale', this.calculateScaling().data);
    this.meshInstance.setParameter('uOffset', this.calculateOffset().data);
    this.meshInstance.setParameter('uColorMap', this.texture);
    this.meshInstance.setParameter('vTint', this.tint.data);
};

Sprite.prototype.onDestroy = function () {
    // remove mesh instance
    if (this.layer) {
        this.layer.removeMeshInstances([this.meshInstance]);
    }
};
