/**
    Konrad Markus, HTTT
    <konker@gmail.com>
*/

var app = (function() {
    var MARKER_PHYSICAL_WIDTH = 60;
    var MARKER_PHYSICAL_HEIGHT = 150;
    var MARKER_MAP_WIDTH = 200;
    var MARKER_MAP_HEIGHT = 400;
    var MARKER_MAP_NODE_RADIUS = 8;

    var AppView = Backbone.View.extend({
        el: '#app',

        initialize: function() {
            app.deviceList.on('add', this.addOneDevice, this);
            app.deviceList.on('reset', this.addAllDevices, this);
            app.deviceList.fetch();

            app.markerList.on('add', this.addOneMarker, this);
            app.markerList.on('reset', this.addAllMarkers, this);
            app.markerList.fetch();

            app.taskList.on('add', this.addOneTask, this);
            app.taskList.on('reset', this.addAllTasks, this);
            app.taskList.fetch();

            app.subjectList.on('add', this.addOneSubject, this);
            app.subjectList.on('reset', this.addAllSubjects, this);
            app.subjectList.fetch();
        },
        events: {
            'click #device-list-refresh': 'deviceListRefresh',
            'click #subject-list-new': 'showNewSubjectForm',
            'click #subject-save': 'writeSubject'
        },
        selectDevice: function(view) {
            if (app.cur.device) {
                app.cur.device.deselect();
            }
            app.cur.device = view;
            app.cur.device.select();
        },
        selectSubject: function(view) {
            if (app.cur.subject) {
                app.cur.subject.deselect();
            }
            app.cur.subject = view;
            app.cur.subject.select();
        },
        selectTask: function(view) {
            if (app.cur.task) {
                app.cur.task.deselect();
            }
            if (!app.cur.device || !app.cur.subject) {
                alert('Please select a device and subject first');
                return false;
            }
            else {
                app.cur.task = view;
                app.cur.task.select();
            }
        },
        deleteSubject: function(view) {
            if (confirm("Are you sure you want to delete this subject?")) {
                view.model.destroy();
                view.remove();
            }
        },
        showEditSubjectForm: function(view) {
            app.appView.cur.subjectView = view;
            app.appView.cur.subjectModel = view.model;

            var f = this.$('#subject-form');
            f.find('#subject-id').prop('disabled', false).val(view.model.get('id'));
            f.find('#subject-name').val(view.model.get('name'));
            f.find('#subject-height').val(view.model.get('height'));
            f.find('#subject-notes').val(view.model.get('notes'));
            f.find('legend').html('Edit subject');
            f.show();
        },
        showNewSubjectForm: function() {
            var f = this.$('#subject-form');
            f.find('#subject-id').val(-1).prop('disabled', true);
            f.find('legend').html('New subject');
            f.show();
        },
        addOneSubject: function(item) {
            var view = new SubjectView({model: item});
            $('#subject-list tbody').append(view.render().el);
        },
        addAllSubjects: function() {
            this.$('#subject-list tbody').empty();
            app.subjectList.each(this.addOneSubject, this);
        },
        addOneMarker: function(item) {
            var view = new MarkerView({model: item});
        },
        addAllMarkers: function() {
            app.paper.clear();
            app.markerList.each(this.addOneMarker, this);
        },
        addOneTask: function(item) {
            var view = new TaskView({model: item});
            $('#task-list tbody').append(view.render().el);
        },
        addAllTasks: function() {
            this.$('#task-list tbody').empty();
            app.taskList.each(this.addOneTask, this);
        },
        addOneDevice: function(item) {
            var view = new DeviceView({model: item});
            $('#device-list tbody').append(view.render().el);
        },
        addAllDevices: function() {
            this.$('#device-list tbody').empty();
            app.deviceList.each(this.addOneDevice, this);
            //this.$('#device-list tr:first-child input[type="radio"]').prop('checked', true);
        },
        writeSubject: function() {
            var id = this.$('#subject-id').val();
            var name = this.$('#subject-name').val();
            var height = this.$('#subject-height').val();
            var notes = this.$('#subject-notes').val();

            var subjectAttrs = {
                name: name,
                height: height,
                notes: notes
            };

            if (id > -1) {
                var subject = app.subjectList.at(id);
                console.log('EDIT');
                console.log(subject);
                subject.set(subjectAttrs);
                subject.save();
            }
            else {
                app.subjectList.create(subjectAttrs);
            }
            this.$('#subject-form').hide();
            //[TODO: select newly added subject in list]
        },
        deviceListRefresh: function() {
            console.log('deviceListRefresh()');
            app.deviceList.fetch();
        },
        taskListRefresh: function() {
            console.log('taskListRefresh()');
            app.taskList.fetch();
        }
    });

    var Subject = Backbone.Model.extend({
        defaults: {
            id: null,
            name: '',
            height: 0,
            notes: ''
        }
    });
    var SubjectView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template($('#subject-view-template').html()),
        initialize: function() {
            this.model.on('change', this.render, this);
        },
        render: function() {
            console.log('SubjectView.render: ' + this.model);
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        events: {
            'click label': function() { return app.appView.selectSubject(this); },
            'click .edit-subject': function() { return app.appView.showEditSubjectForm(this); },
            'click .delete-subject': function() { return app.appView.deleteSubject(this); }
        },
        deselect: function() {
            this._toggleSelected(false);
        },
        select: function() {
            this._toggleSelected(true);
        },
        _toggleSelected: function(on) {
            if (on) {
                this.$el.addClass('selected');
            }
            else {
                this.$el.removeClass('selected');
            }
        }
    });
    var SubjectList = Backbone.Collection.extend({
        model: Subject,
        url: '/subjects',
    });

    var Task = Backbone.Model.extend({
        defaults: {
            id: '',
            f1: null,
            f2: null,
            f3: null,
            f4: null,
            f5: null,
            f6: null,
            f7: null,
            f8: null,
            f9: null,
        }
    });
    var TaskView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template($('#task-view-template').html()),
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        events: {
            'click label': function() { return app.appView.selectTask(this); },
        },
        deselect: function() {
            this._toggleSelected(false);
        },
        select: function() {
            this._toggleSelected(true);
        },
        _toggleSelected: function(on) {
            if (on) {
                this.$el.addClass('selected');
            }
            else {
                this.$el.removeClass('selected');
            }
        }
    });

    var TaskList = Backbone.Collection.extend({
        model: Task,
        url: '/tasks',
    });

    var Marker = Backbone.Model.extend({
        defaults: {
            id: '',
            x: 0,
            y: 0,
            color: '#000000'
        }
    });

    var MarkerView = Backbone.View.extend({
        initialize: function() {
            var x = this.translateX(this.model.get('x'));
            var y = this.translateY(this.model.get('y'));
            this.element = app.paper.circle(x, y, MARKER_MAP_NODE_RADIUS);
            this.element.attr({
                fill: this.model.get('color'),
                stroke: '#aaa'
            });
            var xoffset = 12 + MARKER_MAP_NODE_RADIUS;
            if (this.model.get('x') < 0) {
                xoffset *= -1;
            }

            var label = app.paper.text(x + xoffset, y, this.model.get('id'));
            label.attr({
                'font-size': 15,
                'font-family': 'Helvetica, Verdana',
                'font-weight': 'bold'
            });

            //var lael = app.paper.print(x, y, this.model.get('id'), app.paper.getFont("Museo"), 12).attr({fill: "#00f"});
            //app.paper.add(label);


        },
        translateX: function(x) {
            var ppm = (MARKER_MAP_WIDTH / MARKER_PHYSICAL_WIDTH);
            return (parseFloat(x) + (MARKER_PHYSICAL_WIDTH / 2)) * ppm;
        },
        translateY: function(y) {
            var ppm = (MARKER_MAP_HEIGHT / MARKER_PHYSICAL_HEIGHT);
            return (MARKER_PHYSICAL_HEIGHT - parseFloat(y)) * ppm;
        }
    });

    var MarkerList = Backbone.Collection.extend({
        model: Marker,
        url: '/markers',
    });

    var Device = Backbone.Model.extend({
        defaults: {
            name: '',
            type: ''
        }
    });
    var DeviceView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template($('#device-view-template').html()),
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        events: {
            'click label': function() { return app.appView.selectDevice(this); },
        },
        deselect: function() {
            this._toggleSelected(false);
        },
        select: function() {
            this._toggleSelected(true);
        },
        _toggleSelected: function(on) {
            if (on) {
                this.$el.addClass('selected');
            }
            else {
                this.$el.removeClass('selected');
            }
        }
    });
    var DeviceList = Backbone.Collection.extend({
        model: Device,
        url: '/devices',
    });

    return {
        appView: null,
        paper: Raphael("marker-map", MARKER_MAP_WIDTH, MARKER_MAP_HEIGHT),
        cur: {
            subject: null,
            device: null,
            task: null,
        },
        deviceList: new DeviceList(),
        subjectList: new SubjectList(),
        markerList: new MarkerList(),
        taskList: new TaskList(),
        init: function() {
            app.appView = new AppView();

            // stop forms from actually submitting; all network interaction go via ajax.
            $('form').submit(function(e) { e.preventDefault(); });

            $('#tasks-spec').liteUploader({
                script: '/tasks',
                allowedFileTypes: 'text/plain,text/csv',
                maxSizeInBytes: 1024*1024*2, // 2MB
                typeMessage: 'Only .txt and .csv allowed',
                before: function() {
                    //[FIXME: should these go via backbone?]
                    $('#tasks-spec .upload-details').html('');
                    $('#tasks-spec .upload-response').html('Uploading...');
                },
                each: function(file, errors) {
                    if (errors.length > 0) {
                        $('#tasks-spec .upload-response').html('One or more files did not pass validation');
                        $('#tasks-spec .upload-details').html(errors);
                    }
                },
                success: function(response) {
                    $('#tasks-spec .upload-response').html(response);
                    app.taskList.fetch();
                }
            });

            $('#markers-spec').liteUploader({
                script: '/markers',
                allowedFileTypes: 'text/plain,text/csv',
                maxSizeInBytes: 1024*1024*2, // 2MB
                typeMessage: 'Only .txt and .csv allowed',
                before: function() {
                    //[FIXME: should these go via backbone?]
                    $('#markers-spec .upload-details').html('');
                    $('#markers-spec .upload-response').html('Uploading...');
                },
                each: function(file, errors) {
                    if (errors.length > 0) {
                        $('#markers-spec .upload-response').html('One or more files did not pass validation');
                        $('#markers-spec .upload-details').html(errors);
                    }
                },
                success: function(response) {
                    $('#markers-spec .upload-response').html(response);
                    app.markerList.fetch();
                }
            });
        }
    }
})();

/*
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
var TaskListView = Backbone.View.extend({
    tagName: 'ul',
    className: 'container',
    id: 'taskList'
});

var Subject = Backbone.Model.extend({
    defaults: {
        id: '',
        height: -1
    }
});
*/

$(function() {
    app.init();
});
