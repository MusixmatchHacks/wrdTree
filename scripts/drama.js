
"use strict";

/*
    warning: janky code ahead. Lots of crazy stuff happens at 4AM during a music
    hack day. 
*/

var enApiKey = 'ZXDKV4CO0V4AU5QHZ'
var maxSongsPerArtist = 10;
var curTrack = null;
var curPercent = 0;
var theChart = null;
var thePeaks = null;
var btn = $("#pause-play");

function shrinkHeader() {
    $("#ttext").animate( {'font-size': '4px'}, 400, 'swing', 
        function() {
            $("#ttext").hide();
        });
    $("#ttitle").animate({'font-size': '48px'}, 400);
}


function go() {
    var trackName = $("#track-input").val();
    if (trackName.length > 0) {
        // shrinkHeader();
        info("Searching for " + trackName);
        searchTrack(trackName);
    } else {
        info("Enter an artist and a song name");
    } 
}

var timer = null;

function pause() {
    showPlay(btn);
    window.open('spotify:track:07aUR8QqhFOObXHRYLZ74n', '_parent');
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function p2d(i) {
    var res =  i/100. * curTrack.duration;
    return res;
}

function findPeaks(vec) {
    var all_top = [];
    var maxDramaTime = 30;
    var max = 0;
    var maxDelta = 0;
    var start = 10; 

    if (curTrack.duration > 300) {
        maxDramaTime = 60;
    }

    if (curTrack.duration > 600) {
        maxDramaTime = 90;
    }

    for (var i = 0; i < vec.length - 1; i++) {
        var sv = vec[i];
        var top = 0;
        var tidx = 0;
        if (i >= start && sv > max) {
            max = sv;
        }
        if (i >= start) {
            for (var j = i + 1; j < vec.length; j++) {
                if (p2d(j - i) > maxDramaTime) {
                    break;
                }
                var ev = vec[j];
                var dv = ev - sv;
                if (dv > top) {
                    top = dv;
                    tidx = j;
                    if (dv > maxDelta) {
                        maxDelta = dv;
                    }
                }
            }
            all_top.push([top, tidx]);
        } else {
            all_top.push([0, i + 1]);
        }
    }


    var out = [];
    _.each(all_top, function(v, i) {
        var delta = v[0];
        var peak = vec[v[1]];
        if ((out.length == 0 && delta > 0) || (peak >= .8 * max && delta >= .5 * maxDelta)) {
            var score = v[0] * peak;
            // out.push( [v[0], i, v[1]])
            out.push( [score, i, v[1]])
        }
    });

    out.sort(function(a,b) {
        return a[0] - b[0];
    });
    out.reverse()

    var out2 = [];

    for (var i = 0; i < out.length; i++) {
        var v = out[i][0];
        var idx = out[i][1];
        var ok = true;

        for (var j = 0; j < out2.length; j++) {
            var idx2 = out2[j][1];
            var dist = Math.abs(idx - idx2);
            if (p2d(dist) < maxDramaTime) {
                ok = false;
            }
        }
        if (ok && out[i][0] > 0) {
            out2.push( out[i] )
        }
    }
    return out2;
}

function play(percent_offset) {
    showPause(btn);

    if (timer != null) {
        clearInterval(timer);
        timer = null;
    }

    if (timer == null) {
        var url = percentToUrl(curTrack, percent_offset);
        window.open(url, '_parent');
        curPercent = percent_offset;
        var startPercent = curPercent;
        var seconds = 0;
        theChart.series[0].data[curPercent].select(true);

        timer = setInterval(function() { 
            seconds += 1;
            var percent = 100 * seconds / curTrack.duration;
            curPercent = Math.round(startPercent + percent);
            if (curPercent < 100) {
                theChart.series[0].data[curPercent].select(true);
            } else {
                pause();
            }
        }, 1000);
    }
}

function percentToUrl(track, percent) {
    var time = percentToTime(track, percent);
    var mins = Math.floor(time / 60);
    var secs = Math.round(time - mins * 60);
    var ssecs = secs.toString()
    if (ssecs.length < 2) {
        ssecs = '0' + ssecs;
    }
    var ts =  "#" + mins + ":" + ssecs;
    return track.uri + ts;
}

function percentToTime(track, percent) {
    return percent / 100. * track.duration;
}


function percentToLabel(track, percent) {
    var time = percentToTime(track, percent);
    var mins = Math.floor(time / 60);
    var secs = Math.round(time - mins * 60);
    var ssecs = secs.toString()
    if (ssecs.length < 2) {
        ssecs = '0' + ssecs;
    }
    var label =  mins + ":" + ssecs;
    return label
}

function searchTrack(query) {
    var url = 'https://api.spotify.com/v1/search';
    var params = {
        q: query,
        type:'track',
        country:'us'
    }

    var ul = $("#search-results-list");
    ul.empty();
    $.getJSON(url, params, function(result) {
        var tracks = result.tracks.items;
        if (tracks.length > 0) {
            info("Pick a track ...");
            _.each(tracks, function(track, i) {
                var a = $("<a>");
                a.addClass('list-group-item');
                a.attr('href', '?uri=' + track.uri);
                a.text(track.name + ' - ' + track.artists[0].name);
                ul.append(a);
            });
            $("#search-results").show();
        } else {
            info("Can't find anything that matches " + query);
        }
    });
}

function fetchTrack(uri) {
    var url = 'http://developer.echonest.com/api/v4/track/profile';
    var params = {
        api_key:enApiKey,
        id:uri,
        bucket:['audio_summary']
    }

    $("#search-form").hide();
    var elem = $("#output");
    elem.empty();
    info("Getting info on that track ...");

    $.getJSON(url, params, function(result) {

        function addTrack(track, analysis) {
            info("");
            track.analysis = analysis;
            track.uri = uri;
            var segs = track.analysis.segments;
            var last = segs[segs.length - 1];
            track.duration = last.start + last.duration;
            if (track.analysis) {
                plotTrack(track);
                tweetSetup();
            }
        }

        function interp(t, st, et, sv, ev) {
            var frac = (t - st) / (et - st);
            return (ev - sv) * frac + sv;
        }

        function windowedAverage(vec, winsize) {
            var out = [];
            for (var i = 0; i < vec.length;  i += winsize * 2) {
                var sum = 0;
                var count = 0;
                for (var j = -winsize; j <= winsize; j++) {
                    var idx = i + j;
                    if (idx >= 0 && idx < vec.length) {
                        sum += vec[idx];
                        count += 1;
                    }
                }
                out.push(sum / count);
            }
            return out;
        }

        function getFilteredData(track) {
            var ydata = [];
            var segs = track.analysis.segments;
            var first = segs[0];
            var cseg = first;
            var last = segs[segs.length - 1];

            _.each(segs, function(seg, i) {
                seg.which = i;
                seg.end = seg.start + seg.duration;
                if  (i  < segs.length - 1) {
                    seg.next = segs[i + 1]
                } else {
                    seg.next = null;
                }
            });


            var out = [];
            for (var permille = 0; permille < 1000; permille += 1) {
                var secs = permille / 1000.0 * track.duration;
                var val = -60;
                while (cseg && secs > cseg.end) {
                    cseg = cseg.next;
                }
                if (secs >= cseg.start && secs < cseg.loudness_max_time) {
                    val = interp(secs, cseg.start, cseg.loudness_max_time, cseg.loudness_start, cseg.loudness_max);
                } else {
                    var loudness_end = cseg.next ? cseg.next.loudness_start : -60;
                    val = interp(secs, cseg.loudness_max_time, cseg.end, cseg.loudness_max, loudness_end);
                }
                out.push(loud(val));
            }

            var avg = windowedAverage(out, 5)
            return avg;
        }

        function loud(v) {
            var val =  (v + 60)  / 60.; 
            return val * val * val;
        }


        function plotTrack(track) {
            $("#results").show();
            var chartDiv = $("<div>");
            var outroTime = 8;
            var outroPercent = Math.round(outroTime / track.duration * 100.0);
            curTrack = track;
            curPercent = 0;
            elem.append(chartDiv);
            var y2data = getFilteredData(track);
            var xlabels = [];
            var peaks = findPeaks(y2data);
            thePeaks = peaks;

            _.each(y2data, function(v,i) {
                xlabels.push(percentToLabel(track, i));
            });

            var y3data = [];

            _.each(y2data, function(y) {
                y3data.push(null);
            });

            _.each(peaks, function(peak, i) {
                if (i != 0) {
                    return;
                }
                var start = peak[1];
                var end = peak[2] + outroPercent;
                if (end + 1 < y2data.length) {
                    end += 1;
                } else {
                    end = y2data.length - 1;
                }
                var factor = .99;
                for (var i = start; i <= end; i++) {
                    y3data[i] = y2data[i] * factor;
                }
            });

            $(function () { 
                chartDiv.highcharts({
                    chart: {
                        type:'areaspline',
                    },

                    plotOptions: {
                        series: {
                            marker: {
                                radius:0.1,
                                states: {
                                    hover: {
                                        radius:5
                                    },
                                    select: {
                                        radius:5
                                    }
                                }
                            },
                            point: {
                                events: {
                                    click: function(e) {
                                        play(this.x);
                                    },
                                }
                            }
                        }
                    },

                    title: {
                        text: track.artist + ' - ' + track.title
                    },

                    tooltip: {
                        formatter: function () {
                            var drama = Math.round(this.y * 100) / 100;
                            return 'The drama at <b>' + this.x + '</b> is <b>' + drama + '</b>';
                         }
                    },

                    xAxis: {
                        name:'time',
                        categories: xlabels,
                        labels: {
                            step:5
                        }
                    },

                    yAxis: {
                        max:1,
                        min:0,
                        title: {
                            text: 'The Drama'
                        }
                    },


                    series: [
                        {
                            name:'Loudness',
                            data:y2data
                        },
                        {
                            name:'Peak Drama',
                            data:y3data
                        },
                    ]
                });
                theChart = chartDiv.highcharts();
            });
        }


        if (result.response && result.response.status.code == 0) {
            var track = result.response.track;
            if ('analysis_url' in track.audio_summary) {
                shrinkHeader();
                info("Looking for the drama in " + track.title + " ... ");
                $.getJSON(track.audio_summary.analysis_url, function(analysis) {
                    addTrack(track, analysis)
                }).error(function() {
                    error("That track is way too dramatic for me. Try another.");
                    $("#search-form").show();
                    $("#results").hide();
                });
            } else {
                error("That track is a bit too dramatic for me. Try another.");
                $("#search-form").show();
                $("#results").hide();
            }
        } else {
            error("Had some trouble getting that info about that track. Try another.");
            $("#search-form").show();
            $("#results").hide();
        }
    }).error(function() {
        $("#results").hide();
        error("Can't find that track");
    });
}


function error(msg) {
    info(msg);
}

function info(msg) {
    var info = $("#info");
    if (msg.length == 0) {
        info.hide();
    } else {
        $("#info").text(msg);
        info.show();
    }
}


function showPause(btn) {
    btn.find("i").removeClass('glyphicon-play');
    btn.find("i").addClass('glyphicon-pause');
    btn.find("i").text(' Stop the drama');
}

function showPlay(btn) {
    btn.find("i").removeClass('glyphicon-pause');
    btn.find("i").addClass('glyphicon-play');
    btn.find("i").text(' Play the drama');
}

function urldecode(str) {
   return decodeURIComponent((str+'').replace(/\+/g, '%20'));
}

function processParams() {
    var params = {};
    var q = document.URL.split('?')[1];
    if(q != undefined){
        q = q.split('&');
        for(var i = 0; i < q.length; i++){
            var pv = q[i].split('=');
            var p = pv[0];
            var v = pv[1];
            params[p] = urldecode(v);
        }
    }

    if ('title' in params) {
        // backwards compatible.
        var uri = 'spotify:track:1PB7gRWcvefzu7t3LJLUlf';
        fetchTrack(uri);
    } else if ('uri' in params) {
        var uri = params['uri'];
        fetchTrack(uri);
    }
}

jQuery.ajaxSettings.traditional = true;
$(document).ready(
    function() {
        $("#track-input").keyup(
            function(event) {
                if (event.keyCode == 13) {
                    go();
                }
            }
        );

        $("#go").on('click', go);
        btn.on('click', function() {
            if (timer) {
                pause();
            } else {
                if (thePeaks) {
                    play(thePeaks[0][1]);
                } else {
                    play(curPercent);
                }
            }
        });
        processParams();
    }
);

function tweetSetup() {
    $(".twitter-share-button").remove();
    var tweet = $('<a>')
        .attr('href', "https://twitter.com/share")
        .attr('id', "tweet")
        .attr('class', "twitter-share-button")
        .attr('data-lang', "en")
        .attr('data-size', "large")
        .attr('data-count', "none")
        .text('Tweet');

    $("#tweet-span").prepend(tweet);

    var msg = 'Where is the Drama?';

    if (curTrack && curTrack.title) {
        var msg = 'I found the drama in ' +  curTrack.title + ' with #wheresthedrama'  
    }  

    tweet.attr('data-text', msg);
    tweet.attr('data-url', document.URL);

    // twitter can be troublesome. If it is not there, don't bother loading it
    if ('twttr' in window && twttr.widgets) {
        twttr.widgets.load();
    }
}


