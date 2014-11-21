var g_access_token = '';
var g_username = '';
var g_tracks = [];
var g_artist = '';

function loginWithSpotify() {
   var client_id = '0020790015d449c6ae1aacc4a1e8546d';
   //var redirect_uri = 'http://localhost:8884/callback.html';
   var redirect_uri = 'http://lab.musixmatch.com/polyglottis3/callback.html';
   var url = 'https://accounts.spotify.com/authorize?client_id=' + client_id +
       '&response_type=token' +
       '&scope=playlist-modify-private' +
       '&redirect_uri=' + encodeURIComponent(redirect_uri);
    //console.log(encodeURIComponent(redirect_uri))
    //var w = window.location.assign(url)
    // document.getElementById("SpotifyWidget").innerHTML += '<iframe id = "SpotifyWidgetFrame" width="520" height="600" frameborder="0" allowtransparency="true"></iframe>'
    //                     document.getElementById("SpotifyWidgetFrame").src = url

   var w = window.open(url, 'asdf', 'WIDTH=400,HEIGHT=500');
}


function stripPunct(s)  {
    s = s.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g," ");
    s = s.replace(/\s{2,}/g," ");
    return s;
}

// function searchForSpotifySong(artist, title, callback) {
//     var url = 'https://api.spotify.com/v1/search?type=track&q=';
//     var qa = 'artist:' + stripPunct(artist);
//     var qt = 'track:' + stripPunct(title);
//     var qurl = url + qa + ' ' + qt;

//     $.getJSON(qurl,
//         function(data) {
//                 callback(data);
//         }
//     ).error(function() {
//             callback(null);
//     });
// }

function getUsername() 
{

    var url = 'https://api.spotify.com/v1/me';
    return new Promise(function(resolve,reject){
    	$.ajax(url, {
        	dataType: 'json',
        	headers: {
            	'Authorization': 'Bearer ' + g_access_token
        	},
        	success: function(r) {
            	resolve(r.id);
        	},
        	error: function(r) {
            	reject(null);
        	}
    	})
    })
}

function createPlaylist(playlist_name) 
{
	console.log(playlist_name)
    //return new Promise(function(resolve,reject)
    	//{
    return getUsername().then(function(username)
    		{
				var url = 'https://api.spotify.com/v1/users/' + username + '/playlists';
				//console.log(url)
    			//return new Promise(function(resolve,reject){ 
    			return new Promise(function(resolve, reject)
    			{
    					$.ajax(url, {
        				type: 'POST',
        				data: JSON.stringify({
            				'name': playlist_name,
            				'public': false
        				}),
        				dataType: 'json',
        				headers: {
            				'Authorization': 'Bearer ' + g_access_token,
            				'Content-Type': 'application/json'
        				},
        				success: function(r) {
        					//console.log(url+'/'+r.id)
            				resolve(url+'/'+r.id);
        				},
        				error: function(r) {
            				reject(null);
        				}	
    				});
    			})
    		})
}

function addTracksToPlaylist(playlist_name, tracks) 
{
	return createPlaylist(playlist_name).then(function(playlist_uri){
		//var maxTracksPerPlaylistAdd = 100;
		playlist_uri += '/tracks?uris=';
		//var thisTracks = tracks.slice(start, start + maxTracksPerPlaylistAdd);
		track_uris = tracks.map(function(track){return 'spotify:track:'+ track })
        
        for (var i = 0; i < track_uris.length - 1; i++) {
            playlist_uri += track_uris[i] + ','
        };
        playlist_uri += track_uris[track_uris.length - 1]
        
        console.log(playlist_uri)
		// console.log(JSON.stringify(track_uris))
    	return new Promise(function(resolve,reject){
    			$.ajax(playlist_uri, {
				type: 'POST',
		    	// data: JSON.stringify(track_uris),
		    	// dataType: 'json',
				//processData:true,
		    	headers: {
		        	'Authorization': 'Bearer ' + g_access_token,
		        	'Content-Type': 'application/json'
		    	},
		    	success: function(r) {
		        resolve(playlist_uri)	
		    	},
		    	error: function(r, status, err) {
                console.log(g_access_token)    
                console.log(err)
                console.log(status)
                reject()
		    	// resolve(playlist_uri)
		    	}
			});
    	})
	})        
}

function status(msg) {
    $("#status").text(msg);
}

function doit() {
    // parse hash
    var hash = location.hash.replace(/#/g, '');
    var all = hash.split('&');
    var maxTracks = 10;
    var args = {};

    all.forEach(function(keyvalue) {
        var idx = keyvalue.indexOf('=');
        var key = keyvalue.substring(0, idx);
        var val = keyvalue.substring(idx + 1);
        args[key] = val;
    });

    if (typeof(args['access_token']) != 'undefined') {
        // got access token
        g_access_token = args['access_token'];
    }
    console.log(g_access_token)

}

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}