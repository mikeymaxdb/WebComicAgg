const express = require('express')
const App = express()
const Router = express.Router()

const htmlParser = require('htmlparser2')
const select = require('css-select')
const axios = require('axios')

function filenameFromPath(path) {
    const parts = path.split('/')
    return parts[parts.length - 1].split('.')[0]
}

const comics = [
    {
        name: 'XKCD',
        url: 'https://xkcd.com/',
        process: (dom) => {
            const element = select.selectOne('#comic img', dom)
            const { src, title: alt, alt: title } = element.attribs

            return { src, alt, title }
        },
    },
    { 
        name: 'Saturday Morning Breakfast Cereal',
        url: 'http://www.smbc-comics.com/',
        process: (dom) => {
            let title = select.selectOne('head title', dom).children[0].data
            title = title.replace('Saturday Morning Breakfast Cereal - ', '');

            const element = select.selectOne('#cc-comic', dom)
            const { src, title: alt } = element.attribs

            return { src, alt, title }
        },
    },
    {
        name: 'Cyanide and Happiness',
        url: 'https://explosm.net',
        process: (dom) => {
            const element = select.selectOne('#comic-short img', dom)
            const { src } = element.attribs

            return { src }
        },
    },
    {
        name: 'Dinosaur Comics',
        url: 'https://www.qwantz.com/',
        process: (dom) => {
            let title = select.selectOne('head title', dom).children[0].data
            title = title.split(' - ')[2]

            const { src, title: alt } = select.selectOne('img.comic', dom).attribs

            return {
                src: `https://www.qwantz.com/${src}`,
                title,
                alt,
            }
        },
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
        name: 'Poorly Drawn Lines',
        url: 'https://poorlydrawnlines.com/',
        process: (dom) => {
            const { src } = select.selectOne('.content.comic img', dom).attribs
            const title = filenameFromPath(src).replace('_', ' ')
            return { src, title }
        },
    },
    {
        name: 'Mr. Lovenstein',
        url: 'https://www.mrlovenstein.com',
        process: (dom) => {
            const { src } = select.selectOne('#comic_main_image', dom).attribs
            const titleParts = filenameFromPath(src).split('_')
            const title = titleParts.slice(1, titleParts.length).join(' ')
            return {
                src: `https://www.mrlovenstein.com${src}`,
                title,
            }
        },
    },
]

async function getComicData(config) {
    const { url, name, process } = config

    const res = await axios.get(url)
    const { data, status } = res

    console.log(name, status, url)

    const dom = htmlParser.parseDocument(data)

    const comic = process(dom)

    comic.name = name
    comic.url = url

    return comic
}

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
