/**
    Konrad Markus, HTTT
    <konker@gmail.com>
*/

var map = null;

var Map = Backbone.Model.extend({
    defaults: {
        lat: 0,
        lng: 0,
        zoom: 0,
        canvasId: 'mapCanvas',
        map: null
    },
    initialize: function() {
        this.on("change:lat", this.update);
        this.on("change:lon", this.update);
        this.on("change:zoom", this.update);
    },
    insert: function() {
        var mapOptions = {
            center: new google.maps.LatLng(this.get('lat'), this.get('lng')),
            zoom: this.get('zoom'),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        map = new google.maps.Map(document.getElementById(this.get('canvasId')), mapOptions);
        //google.maps.event.addListener(map, 'click', this.???);
    },
    update: function() {
        map.setCenter(new google.maps.LatLng(this.get('lat'), this.get('lng')));
        map.setZoom(this.get('zoom'));
    }
});

var MapView = Backbone.View.extend({
    initialize: function() {
        this.template = _.template($('#mapViewTemplate').html(), {});
        this.render();
    },
    render: function() {
        $(this.el).html(this.template);
        return this;
    },
    events: {
        "click #mapRefresh": "refresh"
    },
    refresh: function() {
        this.model.update();
    }
});

var Sensor = Backbone.Model.extend({
    defaults: {
        name: '',
        type: ''
    }
});
var SensorList = Backbone.Collection.extend({
    model: Sensor
});

var Device = Backbone.Model.extend({
    defaults: {
        name: '',
        type: ''
    }
});
var DeviceList = Backbone.Collection.extend({
    model: Device
});

$(function() {
    window.mymap = new Map();
    $('#container').html(new MapView({model: mymap}).el);
    mymap.insert();
});
