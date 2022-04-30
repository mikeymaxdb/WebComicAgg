const express = require('express')
const App = express()
const Router = express.Router()

const htmlParser = require('htmlparser2')
const select = require('css-select')
const axios = require('axios')

const comics = [
    {
        name:'xkcd',
        url: 'https://xkcd.com/',
        process: (dom) => {
            const elements = select.selectAll('#comic img', dom)
            const { src, title, alt } = elements[0].attribs
            const result = {}
            result.img = src
            result.alt = title
            result.title = alt

            return result
        }
    },
    // { 
    //     "name":"smbc",
    //     "url":"http://www.smbc-comics.com/rss.php",
    //     "process":function(data) {
    //         data.title = data.title.replace("Saturday Morning Breakfast Cereal - ","");
    //     }
    // },
    // {
    //     "name":"explosm",
    //     "url":"https://explosm-1311.appspot.com/",
    //     "process":function(data){
    //         data.title = undefined;
    //         return data;
    //     }
    // },
    // {
    //     "name":"dino",
    //     "url":"http://www.qwantz.com/rssfeed.php",
    // },
    // {
    //     "name":"extrafab",
    //     "url":"https://www.reddit.com/r/ExtraFabulousComics/new/.rss",
    //     "process":function(data){
    //         data.img = data.img.replace("-150x150","");
    //         data.title = undefined;
    //         return data;
    //     }
    // },
    // {
    //     "name":"poorly",
    //     "url":"https://poorlydrawnlines.com/rss",
    // },
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
    const { url, name, process } = config

    const res = await axios.get(url)
    const { data, status } = res

    console.log(name, status, url)

    const dom = htmlParser.parseDocument(data)
    // console.log(dom)

    return {
        name,
        url,
        ...process(dom.children),
    }
}
