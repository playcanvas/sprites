Rendering Sprites in PlayCanvas
================================

Download sprite.js and upload it to your project or copy paste the code in a new script.

Add the script to an Entity with a Script Component. You will see the following script attributes:

- **textureAsset**: This is the sprite that you want to render. If you want transparency for your sprite make sure that this is a .png file.
- **x**: This is the x **screen** coordinate for your sprite.
- **y**: This is the y **screen** coordinate for your sprite.
- **width**: This is the width of your sprite in pixels. For best results use the actual width of the uploaded image. Powers of 2 have better quality.
- **height**: This is the height of your sprite in pixels. For best results use the actual height of the uploaded image. Powers of 2 have better quality.
- **depth**: This is the z-index of your sprite. If you want it to appear behind other sprites increase this value.
- **uPercentage**: A value between [0,1] that specifies the maximum u value of the texture.
- **vPercentage**: A value between [0,1] that specifies the maximum v value of the texture.
- **anchor**: Determines where to anchor the sprite on the screen, for example top, center, bottom right etc.
- **pivot**: Determines the alignment (or pivot point) of the sprite.
- **tint**: A color to multiply the current color of the sprite with.
- **maxResHeight**: Set this to the target resolution height of your app. The final scale of your sprite will be calculated as canvasHeight / maxResHeight.

Creating a UI with Sprites
===========================

Using the sprite.js script you can create a user interface for your application.

- Create images using your favorite tool. For best quality sprites should be png files with power of 2 width and height.
- Upload them to PlayCanvas.

For each one of your sprites:
- Create an Entity
- Add a script component to the Entity
- Add sprite.js in the URLs field
- Click on textureAsset and pick the desired image
- Set the rest of the fields to your liking
- Launch the application

Buttons
=======

You can attach an event handler for each sprite for the 'click' event. For example add this script on the same Entity as the sprite:

```
pc.script.create('myhandler', function (app) {
    var Myhandler = function (entity) {
        this.entity = entity;
    };

    Myhandler.prototype = {
        initialize: function () {
            this.entity.script.sprite.on('click', this.onClick, this);
        },

        onClick: function () {
            console.log('Click');
        }
    };

    return MyHandler;
});
```

That way you can have buttons that do something when you click on them.

Progress Bars
=============

Check out this pack for an example on how to make progress bars using sprites and different anchors:

https://playcanvas.com/editor/scene/336436

Rendering Text
==============

Check out this repository for scripts and details on how to render bitmap fonts: https://github.com/playcanvas/fonts

