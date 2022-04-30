const express = require('express')
const App = express()
const Router = express.Router()

const convert = require('xml-js')
const axios = require('axios')

const comics = [
    {
        "name":"xkcd",
        "url": "https://xkcd.com/info.0.json"
    },
    { 
        "name":"smbc",
        "url":"http://www.smbc-comics.com/rss.php",
        "process":function(data) {
            data.title = data.title.replace("Saturday Morning Breakfast Cereal - ","");
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
    // {
    //     "name":"extrafab",
    //     "url":"https://www.reddit.com/r/ExtraFabulousComics/new/.rss",
    //     "process":function(data){
    //         data.img = data.img.replace("-150x150","");
    //         data.title = undefined;
    //         return data;
    //     }
    // },
    {
        "name":"poorly",
        "url":"https://poorlydrawnlines.com/rss",
    },
]

App.use(express.static('public'))

App.get('/feed', function (req, res){

    const loadPromises = []

    console.log(new Date().toLocaleString())

    comics.forEach((comic) => {
        loadPromises.push(getComicData(comic))
    })

    Promise.allSettled(loadPromises).then((results) => {
        const data = []

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                data.push(result.value)
            }
        })

        res.send(data)
    })
})

App.listen(3100, () => {
    console.log('[i] Listening on port 3100');
})

async function getComicData(config) {
    const { url, name } = config

    const res = await axios.get(url)
    const { data, status } = res

    console.log(name, status, url)

    const result = {
        name,
    }

    try {
        if (typeof data === 'object') {
            console.log(data)
            const { img, alt, safe_title, link } = data
            result.img = img
            result.alt = alt
            result.title = safe_title
            result.link = link
        } else {
            const xml = convert.xml2js(data, { compact: true })
            const latestItem = xml.rss ? xml.rss.channel.item[0] : xml.feed.entry[0]

            const srcRegex = /<img.*?src=['"](.*?)['"]/;
            const altRegex = /<img.*?title=['"](.*?)['"]/;

            let imgString
            let imgSrc

            imgString = 
                (latestItem.description && latestItem.description['_cdata'])
                || (latestItem.description && latestItem.description['_text'])
                || (latestItem['content:encoded'] && latestItem['content:encoded']['_cdata'])
                || (latestItem.content && latestItem.content['_text'])

            imgSrc = srcRegex.exec(imgString)
            alt = altRegex.exec(imgString)

            // console.log(latestItem)

            if(imgSrc && imgSrc.length >= 2){
                result.img = imgSrc[1];
            }

            if(alt && alt.length >= 2){
                result.alt = alt[1];
            }

            if(latestItem.title){
                if(latestItem.title['_cdata']){
                    result.title = latestItem.title['_cdata'];
                } else if(latestItem.title['_text']){
                    result.title = latestItem.title['_text'];
                }
            }

            result.link = latestItem.link['_text']

            if (config.process) {
                config.process(result)
            }
        }
    } catch (error) {
        console.log(error)
    }

    return result
}
