// TODO: add caching server-side

var express = require('express');
var App = express();
var Router = express.Router();

var convert = require('xml-js');
var request = require('request');

App.use(express.static('public'));

App.get('/feed', function (req, res){
	var data = {
		"comics":[]
	};
	var comicIndex = 0;

    var comics = [
    	{ 
    		"name":"smbc",
    		"url":"http://www.smbc-comics.com/rss.php",
    		"process":function(data){
    			data.title = data.title.replace("Saturday Morning Breakfast Cereal - ","");
    			return data;
    		}
    	},
    	{
    		"name":"explosm",
    		"url":"https://explosm-1311.appspot.com/",
    		"process":function(data){
    			data.title = undefined;
    			return data;
    		}
    	},
    	{
    		"name":"dino",
    		"url":"http://www.qwantz.com/rssfeed.php",
    	},
    	{
    		"name":"extrafab",
    		"url":"http://extrafabulouscomics.com/feed/",
    		"process":function(data){
    			data.img = data.img.replace("-150x150","");
    			data.title = undefined;
    			return data;
    		}
    	},
    	{
    		"name":"poorly",
    		"url":"http://pdlcomics.tumblr.com/rss",
    	},
    	{
    		"name":"whomp",
    		"url":"http://www.whompcomic.com/rss.php",
    		"process":function(data){
    			data.img = data.img.replace("comicsthumbs","comics");
        		data.title = data.title.replace("Whomp! - ","");
        		return data;
    		}
    	}
    ];

	(function nc2(comic){
		if(comic){
			data[comic.name] = comic;
			data.comics.push(comic.name);
			comicIndex++;
		}

		if(comicIndex == comics.length){
			// We're done, send the data
			res.send(data);
		} else{
			// Get the next comic
			comicDB = comics[comicIndex];
			getComicData(comicDB,nc2);
		}
	})();
	// ^ We start here
});

var Server = App.listen(3100, function () {
  console.log('[i] Listening on port 3100');
});

function getComicData(comicDB,callback){
	console.log('url:',comicDB.url);
	request(comicDB.url, function (error, response, body) {
        console.log('error:', error);
        console.log('statusCode:', response && response.statusCode);

        var result = convert.xml2js(body, {compact: true});

        var item = result.rss.channel.item[0];

        var srcRegex = /<img.*?src=['"](.*?)['"]/;
        var altRegex = /<img.*?title=['"](.*?)['"]/;

        var src,title,alt;
		
		if(item.description["_cdata"]){
			src = srcRegex.exec(item.description["_cdata"]);
			alt = altRegex.exec(item.description["_cdata"]);
		} else if(item.description["_text"]){
			src = srcRegex.exec(item.description["_text"]);
			alt = altRegex.exec(item.description["_text"]);
		}

		if(src && src.length >= 2){
			src = src[1];
		}

		if(alt && alt.length >= 2){
			alt = alt[1];
		}

		if(item.title){
			if(item.title["_cdata"]){
				title = item.title["_cdata"];
			} else if(item.title["_text"]){
				title = item.title["_text"];
			}
		}

        var data = {
        	"name": comicDB.name,
        	"title": title,
        	"img": src,
        	"alt": alt
        };

        if(comicDB.process){
        	data = comicDB.process(data);
        }

		callback(data);	
    });
}