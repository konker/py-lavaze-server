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
        _childTaskViews: null,
        timerEl: null,

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

            this.timerEl = $('#timer .time');
        },
        events: {
            'click #device-list-refresh': 'deviceListRefresh',
            'click #subject-list-new': 'showNewSubjectForm',
            'click #subject-save': 'writeSubject',
            'click #answer-save': 'writeAnswer',
            'click #timer-start': 'toggleTimer',
            'click #timer-reset': 'resetTimer'
        },
        resetTimer: function() {
            if (app.timer.active) {
                app.appView._toggleTimerButton();
            }
            app.timer.reset(function(time) {
                app.appView.timerEl.html(time);
            });
        },
        toggleTimer: function() {
            if (app.timer.active) {
                app.timer.stop();
                app.appView._toggleTimerButton();
            }
            else {
                app.timer.start(function(time) {
                    app.appView.timerEl.html(time);
                });
                app.appView._toggleTimerButton();
            }
        },
        _toggleTimerButton: function() {
            $('#timer-start')
                .toggleClass('btn-success')
                .toggleClass('btn-warning')
                .find('i')
                .toggleClass('icon-play')
                .toggleClass('icon-pause');
        },
        writeAnswer: function() {
            var url = '/tasks/' + app.cur.task.model.get('id') + '/answer';
            var distance = $('#answer-distance').val();
            var operator = $('#answer-relative-operator').val();
            var marker = $('#answer-marker').val();
            var time_secs = app.timer.rep

            //[FIXME: validate]
            var actual_answer = $('#distance-display .absolute').html();
            if (operator != '') {
                actual_answer = $('#distance-display .relative').html() + operator + marker;
            }
            var answer = distance + operator + marker;
            $.ajax({
                url: url,
                type: 'POST',
                data: {
                    device_id: app.cur.device.model.get('id'),
                    subject_id: app.cur.subject.model.get('id'),
                    time_secs: time_secs,
                    answer: answer
                },
                success: function(data, textStatus, jqXHR) {
                    // update last answer block
                    //[TODO]

                    // select next task
                    var curIndex = _(app.appView._childTaskViews).indexOf(app.cur.task);
                    console.log(curIndex);
                    if (curIndex != -1) {
                        curIndex = curIndex + 1;
                        if (curIndex < (app.appView._childTaskViews.length - 1)) {
                            // get the next task view
                            app.appView.setLastAnswer(app.timer.time(), answer, actual_answer);
                            app.appView.selectTask(app.appView._childTaskViews[curIndex]);
                        }
                        else {
                            alert('Tasks finished');
                        }
                    }
                    else {
                        alert('indexOf failed');
                    }

                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert(errorThrown);
                }
            });
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
        setLastAnswer: function(time, answer, actual_answer) {
            $('#last-answer .actual-value').html(actual_answer);
            $('#last-answer .subject-value').html(answer);
            $('#last-answer .subject-time').html(time);
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
                view.$('input').prop('checked', true);
                $('#distance-display .absolute').html(view.model.get('f6'));
                $('#distance-display .relative').html('-');

                $('#answer-relative-operator').val('');
                $('#answer-marker').val('');
                $('#answer-distance').val('').focus();

                app.appView.resetTimer();
                app.appView.toggleTimer();
            }
        },
        deleteSubject: function(view) {
            if (confirm("Are you sure you want to delete this subject?")) {
                view.model.destroy();
                view.remove();
            }
        },
        showEditSubjectForm: function(view) {
            app.cur.subject = view;

            var f = this.$('#subject-form-holder');
            f.find('#subject-id').prop('disabled', false).val(view.model.get('id'));
            f.find('#subject-name').val(view.model.get('name'));
            f.find('#subject-height').val(view.model.get('height'));
            f.find('#subject-notes').val(view.model.get('notes'));
            f.find('legend').html('Edit subject');
            f.show();
        },
        showNewSubjectForm: function() {
            var f = this.$('#subject-form-holder');
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
            this._childTaskViews.push(view);
            $('#task-list tbody').append(view.render().el);
        },
        addAllTasks: function() {
            this._childTaskViews = [];
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
                //[XXX: only one subject at a time]
                app.subjectList.reset().create(subjectAttrs);
            }
            this.$('#subject-form-holder').hide();
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
        timer: {
            rep: 0,
            iid: null,
            active: false,

            start: function(callback) {
                if (app.timer.iid) {
                    clearInterval(app.timer.iid);
                }
                app.timer.iid = setInterval(function() {
                                                app.timer.tick(callback);
                                            },
                                            1000);
                app.timer.active = true;
            },
            stop: function() {
                if (app.timer.iid) {
                    clearInterval(app.timer.iid);
                    app.timer.active = false;
                }
                app.timer.iid = null;
            },
            reset: function(callback) {
                app.timer.stop();
                app.timer.rep = 0;
                callback(app.timer.time());
            },
            tick: function(callback) {
                app.timer.rep += 1;
                callback(app.timer.time());
            },
            time: function() {
                var time = '';
                var mins = 0;
                if (app.timer.rep > 60) {
                    mins = Math.floor(app.timer.rep/60);
                    time += mins + ':' + app.timer._pad(app.timer.rep - (mins * 60));
                }
                else {
                    time = '0:' + app.timer._pad(app.timer.rep);
                }
                return time;
            },
            _pad: function(t) {
                if (t < 10) {
                    return '0' + t;
                }
                return t;
            }
        },
        deviceList: new DeviceList(),
        subjectList: new SubjectList(),
        markerList: new MarkerList(),
        taskList: new TaskList(),
        events: {
            textInputFocus: function(e) {
                e.target.select();
            },
            markerChange: function() {
                var marker = $('#answer-marker').val();
                var operator = $('#answer-relative-operator').val();

                if (marker != '') {
                    marker = parseInt(marker) - 1;
                    var my = parseFloat(app.markerList.models[marker].get('y'));
                    var y = parseFloat(app.cur.task.model.get('f6'));
                    var relative = -1;

                    if (operator == '>') {
                        relative = y - my;
                    }
                    else if (operator == '<') {
                        relative = y - my;
                    }

                    console.log(my)
                    console.log(y)
                    console.log(operator)
                    console.log(relative)
                    if (relative >= 0) {
                        $('#distance-display .relative').html(relative);
                    }
                    else {
                        $('#distance-display .relative').html('-');
                    }
                }
            },
            textInputKeypress: function(e) {
                if (e.which == 60) {
                    // <
                    $('#answer-relative-operator').val('<');
                    $('#answer-marker').focus();
                    e.preventDefault();
                }
                else if (e.which == 62) {
                    // >
                    $('#answer-relative-operator').val('>');
                    $('#answer-marker').focus();
                    e.preventDefault();
                }
                else if (e.which == 32) {
                    //space
                    app.appView.toggleTimer();
                    e.preventDefault();
                }
                else if (e.which == 13) {
                    app.appView.writeAnswer();
                    e.preventDefault();
                }
            },
        },
        init: function() {
            app.appView = new AppView();

            // stop forms from actually submitting; all network interaction go via ajax.
            $('form').submit(function(e) { e.preventDefault(); });

            // set up ajax file uploader for tasks
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

            // set up ajax file uploader for tasks
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

            // capture keyboard shortcuts
            $('#app').on('keypress', app.events.globalKeypress);
            $('#answer input').on('focus', app.events.textInputFocus);
            $('#answer input').on('keypress', app.events.textInputKeypress);
            $('#answer-marker').on('change', app.events.markerChange);
            $('#answer-relative-operator').on('change', app.events.markerChange);
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
