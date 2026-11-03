import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const output=resolve('qa-perfiles')
mkdirSync(output,{recursive:true})
const readme=readFileSync('README.md','utf8')
const required=[
'https://melgarejomaycol.vercel.app/',
'https://cifrya.com/demo',
'https://recetas-api-k91i.onrender.com/api-docs',
'https://github.com/MelgarejoMaycol/Recetas-TS',
'https://github.com/MelgarejoMaycol/TRACKFILE',
'https://www.linkedin.com/in/maycol-melgarejo-a59bb9322/'
]
for(const u of required){if(!readme.includes(u))throw Error('Referencia obligatoria ausente: '+u)}
if(readme.includes('recetas-api-j4p8.onrender.com'))throw Error('El README aún apunta al dominio antiguo de la API')
if(!readme.includes('Mi compañera lideró el backend Spring Boot'))throw Error('Falta distinguir autoría del backend TrackFile')
if(!readme.includes('proyectos personales'))throw Error('Falta distinguir empleo de proyectos')
const sizes=[{name:'pc',width:1440,height:900},{name:'movil',width:390,height:844}]
const pages=[
{name:'github',url:'https://github.com/MelgarejoMaycol',expected:'GitHub'},
{name:'linkedin',url:'https://www.linkedin.com/in/maycol-melgarejo-a59bb9322/',expected:'LinkedIn'},
{name:'portafolio',url:'https://melgarejomaycol.vercel.app/',expected:'portafolio'}
]
const browser=await chromium.launch()
const report=[]
for(const size of sizes){
 const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},reducedMotion:'reduce',locale:'es-CO'})
 for(const site of pages){
  const page=await ctx.newPage()
  try{
   const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:35000})
   await page.waitForTimeout(1200)
   const data=await page.evaluate(()=>({
     title:document.title,
     h1:[...document.querySelectorAll('h1')].map(e=>e.innerText).filter(Boolean).slice(0,3),
     bodyText:document.body?.innerText?.slice(0,1800)||'',
     totalWidth:document.documentElement.scrollWidth,
     viewportWidth:document.documentElement.clientWidth
   }))
   await page.screenshot({path:resolve(output,site.name+'-'+size.name+'.png'),fullPage:false,animations:'disabled'})
   let access='public'
   if(site.name==='linkedin' && /sign in|iniciar sesi[oó]n|join now|únete|not available|no disponible|cookie/i.test(data.bodyText.slice(0,400)))access='limited'
   report.push({site:site.name,size:size.name,status:response?.status()||0,access,...data})
   console.log(site.name,size.name,response?.status(),access,data.title,data.h1.join(' | '))
  }catch(e){report.push({site:site.name,size:size.name,error:String(e).slice(0,600)});console.log('UNAVAILABLE',site.name,size.name,String(e).slice(0,250))}
  finally{await page.close()}
 }
 await ctx.close()
}
await browser.close()
writeFileSync(resolve(output,'review.json'),JSON.stringify({at:new Date().toISOString(),report},null,2))
const blocked=report.filter(x=>x.site==='github'&&x.status!==200)
if(blocked.length)process.exitCode=1
