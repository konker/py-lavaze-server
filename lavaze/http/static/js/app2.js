/**
    Konrad Markus, HTTT
    <konker@gmail.com>
*/

var AppView = Backbone.View.extend({
    el: '#app',

    initialize: function() {
        deviceList.on('add', this.addOneDevice, this);
        deviceList.on('reset', this.addAllDevices, this);
        deviceList.fetch();

        markerList.on('add', this.addOneMarker, this);
        markerList.on('reset', this.addAllMarkers, this);
        markerList.fetch();

        taskList.on('add', this.addOneTask, this);
        taskList.on('reset', this.addAllTasks, this);
        taskList.fetch();

        subjectList.on('add', this.addOneSubject, this);
        subjectList.on('reset', this.addAllSubjects, this);
        subjectList.fetch();
    },
    events: {
        'click #device-list-refresh': 'deviceListRefresh',
        'click #task-list-refresh': 'taskListRefresh',
        'click #subject-save': 'createSubject'
    },
    addOneSubject: function(item) {
        var view = new SubjectView({model: item});
        $('#subject-list').append(view.render().el);
    },
    addAllSubjects: function() {
        this.$('#subject-list').empty();
        subjectList.each(this.addOneSubject, this);
    },
    addOneMarker: function(item) {
        console.log('addOneMarker');
        console.log(item);
        var view = new MarkerView({model: item});
        $('#marker-list').append(view.render().el);
    },
    addAllMarkers: function() {
        this.$('#marker-list').empty();
        markerList.each(this.addOneMarker, this);
    },
    addOneTask: function(item) {
        var view = new TaskView({model: item});
        $('#task-list').append(view.render().el);
    },
    addAllTasks: function() {
        this.$('#task-list').empty();
        taskList.each(this.addOneTask, this);
    },
    addOneDevice: function(item) {
        var view = new DeviceView({model: item});
        $('#device-list').append(view.render().el);
    },
    addAllDevices: function() {
        this.$('#device-list').empty();
        deviceList.each(this.addOneDevice, this);
        this.$('#device-list li:first-child input[type="radio"]').prop('checked', true);
    },
    createSubject: function() {
        var name = this.$('#subject-name').val();
        var height = this.$('#subject-height').val();
        var notes = this.$('#subject-notes').val();

        var subject = {
            name: name,
            height: height,
            notes: notes
        };
        subjectList.create(subject);
    },
    deviceListRefresh: function() {
        console.log('deviceListRefresh()');
        deviceList.fetch();
    },
    taskListRefresh: function() {
        console.log('taskListRefresh()');
        taskList.fetch();
    }
});

var Subject = Backbone.Model.extend({
    defaults: {
        id: null,
        name: '',
        height: 0,
        notes: ''
    },
    url: '/subjects'
});
var SubjectView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#subject-view-template').html()),
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});
var SubjectList = Backbone.Collection.extend({
    model: Subject,
    url: '/subjects',
});
var subjectList = new SubjectList();

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
    tagName: 'li',
    template: _.template($('#task-view-template').html()),
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

var TaskList = Backbone.Collection.extend({
    model: Task,
    url: '/tasks',
});
var taskList = new TaskList();

var Marker = Backbone.Model.extend({
    defaults: {
        id: '',
        x: 0,
        y: 0,
        color: '#000000'
    }
});
var MarkerView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#marker-view-template').html()),
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

var MarkerList = Backbone.Collection.extend({
    model: Marker,
    url: '/markers',
});
var markerList = new MarkerList();

var Device = Backbone.Model.extend({
    defaults: {
        name: '',
        type: ''
    }
});
var DeviceView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#device-view-template').html()),
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});
var DeviceList = Backbone.Collection.extend({
    model: Device,
    url: '/devices',
});
var deviceList = new DeviceList();

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
    var app = new AppView();

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
            taskList.fetch();
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
            markerList.fetch();
        }
    });
});
