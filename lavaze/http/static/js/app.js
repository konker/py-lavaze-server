/**
Konrad Markus, HTTT
<konker@gmail.com>
*/


App = Ember.Application.create({
    VERSION: "0.1",
    LOG_JSON_URL: '/Log',

    ready: function() {
        App.util.init();
        App.MainView.create().appendTo('#container');

        App.MapController.set('content', App.Map);
        App.LogController.set('content', App.Log.all());
    },
    MainView: Ember.View.extend({
        templateName: 'main'
    }),
    MapController: Ember.ObjectController.create({
    }),
    MapView: Ember.View.extend({
        templateName: 'map',

        initMap: function() {
            App.Map.initMap();
        },
        refresh: function() {
            App.Map.update();
        }
    }),
    LogController: Ember.ArrayController.create({
        content: null,
    }),
    LogView: Ember.View.extend({
        templateName: 'log',

        refresh: function() {
            App.Log.all();
        }
    })
});

App.Map = Ember.Object.extend();
App.Map.reopenClass({
    // 60.1865501, 24.8183403, 12
    lat: 0,
    lng: 0,
    zoom: 12,
    map: null,

    initMap: function() {
        //if (GBrowserIsCompatible()) {
            var mapOptions = {
                center: new google.maps.LatLng(App.Map.lat, App.Map.lng),
                zoom: App.Map.zoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            App.Map.map = new google.maps.Map(document.getElementById("mapCanvas"), mapOptions);
            google.maps.event.addListener(App.Map.map, 'click', App.Map.onClick);
            //App.Map.map.setCenter(new GLatLng(App.Map.lat, App.Map.lng), App.Map.zoom);
            //App.Map.map.setMapType(G_HYBRID_MAP);
            //App.Map.map.setUIToDefault();
            //App.Map.map.enableRotation();
            /*
            GEvent.addListener(App.Map.map, "click", function (overlay, latlng) {
                if (latlng) {
                    App.Map.map.addOverlay(App.Map.createMarker(latlng, null));
                }
            });
            */
        //}
    },
    update: function() {
        App.Map.map.setCenter(new google.maps.LatLng(App.Map.lat, App.Map.lng));
        App.Map.map.setZoom(App.Map.zoom);
    },
    onClick: function(event) {
        App.Map.placeMarker(event.latLng);
    },
    placeMarker: function(latLng) {
        var marker = new google.maps.Marker({
            position: latLng,
            map: App.Map.map
        });
        App.Map.app.setCenter(latLng);
        /*
        if (options == null) {
            options = {
                draggable: true
            }
        }
        marker = new GMarker(latlng, options);
        marker.value = latlng;
        GEvent.addListener(marker, 'click', function () {
            App.Map.map.removeOverlay(marker);
        });
        return marker;
        */
    }
});

App.Log = Ember.Object.extend();
App.Log.reopenClass({
    log: Ember.A(),
    all: function() {
        App.util.loading.on();

        var _log = this.log;
        $.ajax({
            url: App.LOG_JSON_URL,
            type: 'GET',
            dataType: 'json',
            error: function(jqXHR, textStatus, errorThrown) {
                App.util.alert.show("Could not execute operation.", errorThrown);
                App.util.loading.off();
            },
            success: function(data, textStatus, jqXHR) {
                _log.clear();
                _log.pushObjects(data.body.log);
                App.util.loading.off();
            }
        });
        return _log;
    }
});


/* Utility code */
App.reopen({
    util: {
        init: function() {
            App.util.alert.init();
            Handlebars.registerHelper('format_timestamp', App.util.format_timestamp_helper);
            Handlebars.registerHelper('format_secs', App.util.format_secs_helper);
            Handlebars.registerHelper('format_b', App.util.format_b_helper);
            Handlebars.registerHelper('format_kb', App.util.format_kb_helper);
            Handlebars.registerHelper('format_mb', App.util.format_mb_helper);
        },
        alert: {
            init: function() {
                //$('#alert').alert();
                $('#alert .close').bind('click', App.util.alert.hide);
                $('#alert').hide();
            },
            show: function(body, title) {
                $('#alert')
                    .find('.body').html(body);
                $('#alert')
                    .find('.title').html(title);

                $('#alert').show();
            },
            hide: function() {
                //$('#alert').alert('close');
                $('#alert').hide();
            }
        },
        loading: {
            _stack: 0,
            on: function() {
                App.util.loading._stack++;
                App.util.loading._setLoading(true);
            },
            off: function() {
                App.util.loading._stack--;
                if (App.util.loading._stack <= 0) {
                    App.util.loading._setLoading(false);
                }
            },
            _setLoading: function(on) {
                if (on) {
                    $('h1').addClass('loading');
                }
                else {
                    $('h1').removeClass('loading');
                    App.util.loading._stack = 0;
                }
            }
        },
        format_timestamp_helper: function(property, options) {
            var ts = Ember.Handlebars.get(this, property, options);
            return new Handlebars.SafeString(App.util.format_timestamp(ts));
        },
        format_timestamp: function(ts) {
            var d = new Date(ts);
            return jQuery.timeago(d) + "<br/><small>" + App.util.ReadableDateString(d) + "</small><br/><small>" + ts + "</small>";
        },
        /*
        format_timestamp: function(ts) {
            return App.util.ReadableDateString(new Date(ts)) + "<br/><small>" + ts + "</small>";
        },
        */
        ReadableDateString: function(d) {
            function pad(n){return n<10 ? '0'+n : n}
                return d.getFullYear()+'-'
                    + pad(d.getMonth()+1)+'-'
                    + pad(d.getDate())+' '
                    + pad(d.getHours())+':'
                    + pad(d.getMinutes())+':'
                    + pad(d.getSeconds())
        },
        ISODateString: function(d) {
            function pad(n){return n<10 ? '0'+n : n}
                return d.getUTCFullYear()+'-'
                    + pad(d.getUTCMonth()+1)+'-'
                    + pad(d.getUTCDate())+'T'
                    + pad(d.getUTCHours())+':'
                    + pad(d.getUTCMinutes())+':'
                    + pad(d.getUTCSeconds())+'Z'
        },
        format_secs_helper: function(property, options) {
            var secs = Ember.Handlebars.get(this, property, options);
            return App.util.format_secs(secs);
        },
        format_secs: function(secs) {
            if (secs > 60) {
                if (secs > 3600) {
                    return Math.round(secs/3600) + " hrs";
                }
                return Math.round(secs/60) + " mins";
            }
            return secs + " secs";
        },
        format_b_helper: function(property, options) {
            var b = Ember.Handlebars.get(this, property, options);
            return App.util.format_b(b);
        },
        format_b: function(b) {
            if (b > 1024) {
                return App.util.format_kb(b/1024);
            }
            return b.toFixed(2) + " KB";
        },
        format_kb_helper: function(property, options) {
            var kb = Ember.Handlebars.get(this, property, options);
            return App.util.format_kb(kb);
        },
        format_kb: function(kb) {
            if (kb > 1024) {
                return App.util.format_mb(kb/1024);
            }
            return kb.toFixed(2) + " KB";
        },
        format_mb_helper: function(property, options) {
            var kb = Ember.Handlebars.get(this, property, options);
            return App.util.format_mb(mb);
        },
        format_mb: function(mb) {
            if (mb > 1024) {
                return (mb/1024).toFixed(2) + " GB";
            }
            return mb.toFixed(2) + " MB";
        }
    }
});

