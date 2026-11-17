/* T&H V1 — site institucional. WebGL nativo; sem dependências externas. */
(function(){
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('year').textContent = String(new Date().getFullYear());
  const nav = document.getElementById('topnav');
  function navUpdate(){nav.classList.toggle('scrolled', window.scrollY > 20)}
  window.addEventListener('scroll',navUpdate,{passive:true});navUpdate();
  const toggle = document.getElementById('menuToggle'),mobile=document.getElementById('mobileMenu');
  toggle.addEventListener('click',()=>{let open=mobile.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'✕':'☰'});
  mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobile.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='☰'}));
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.11});document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));
  const navi=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id))}}),{rootMargin:'-20% 0px -65% 0px'});['sobre','atuacao','jogos','contato'].forEach(id=>navi.observe(document.getElementById(id)));
  const form=document.getElementById('briefingForm');form.addEventListener('submit',async ev=>{ev.preventDefault();if(!form.reportValidity())return;const v=id=>document.getElementById(id).value.trim();const message=`BRIEFING — T&H TORII & HUTUKARA\n\nNome: ${v('clientName')}\nE-mail: ${v('clientEmail')}\nEmpresa/projeto: ${v('clientCompany') || 'Não informado'}\nTipo de experiência: ${v('clientType') || 'A definir'}\n\nIdeia:\n${v('clientMessage')}`;const status=document.getElementById('formStatus');try{await navigator.clipboard.writeText(message);status.textContent='Briefing copiado! Você pode colá-lo onde preferir.'}catch(err){const ta=document.createElement('textarea');ta.value=message;ta.style.position='fixed';ta.style.top='-9999px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();status.textContent=ok?'Briefing copiado!':'Seu navegador bloqueou a cópia automática. Selecione e copie o texto dos campos.'}});
  // WebGL viewer with direct glTF Binary (.glb) parser, no remote JS or CSS dependencies.
  const canvas=document.getElementById('modelCanvas'),host=document.getElementById('heroCore');
  let gl;try{gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'high-performance'})}catch(e){};if(!gl){return}
  const vertexSource=`#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uViewProjection;
    out vec3 vNormal;
    out vec3 vPosition;
    void main(){
      vec4 p=uModel*vec4(aPosition,1.0);
      vPosition=p.xyz;
      vNormal=mat3(uModel)*aNormal;
      gl_Position=uViewProjection*p;
    }`;
  const fragmentSource=`#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec3 vPosition;
    uniform vec3 uEye;
    uniform float uTime;
    out vec4 fragColor;
    void main(){
      vec3 n=normalize(vNormal);
      vec3 l=normalize(vec3(-0.35,0.9,1.3));
      vec3 eye=normalize(uEye-vPosition);
      float lambert=max(dot(n,l),0.0);
      float secondary=max(dot(n,normalize(vec3(1.0,0.2,-0.45))),0.0);
      float rim=pow(1.0-max(dot(n,eye),0.0),2.15);
      float spec=pow(max(dot(reflect(-l,n),eye),0.0),24.0);
      vec3 base=vec3(0.78,0.89,1.0);
      vec3 col=base*(0.42+lambert*0.66)+vec3(0.10,0.29,0.68)*secondary*0.23;
      col+=vec3(0.16,0.48,1.0)*rim*0.94;
      col+=vec3(0.93,0.97,1.0)*spec*0.24;
      col=mix(col,vec3(0.18,0.47,0.98),0.07+0.025*sin(uTime*0.7));
      fragColor=vec4(col,1.0);
    }`;
  function compile(type,source){let shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader}
  let program;try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program))}catch(e){console.error('3D shader:',e);return}
  const modelLoc=gl.getUniformLocation(program,'uModel'),vpLoc=gl.getUniformLocation(program,'uViewProjection'),eyeLoc=gl.getUniformLocation(program,'uEye'),timeLoc=gl.getUniformLocation(program,'uTime');
  function multiply(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
  function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
  function translate(x,y,z){let m=identity();m[12]=x;m[13]=y;m[14]=z;return m}
  function scale(s){let m=identity();m[0]=s;m[5]=s;m[10]=s;return m}
  function rotateX(a){let m=identity(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
  function rotateY(a){let m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
  function perspective(fov,aspect,n,f){let t=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=t/aspect;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m}
  const componentMap={5120:gl.BYTE,5121:gl.UNSIGNED_BYTE,5122:gl.SHORT,5123:gl.UNSIGNED_SHORT,5125:gl.UNSIGNED_INT,5126:gl.FLOAT};const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  let meshes=[],bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},ready=false,raf=0;
  function parseGLB(arr){
    const dv=new DataView(arr);if(dv.getUint32(0,true)!==0x46546c67)throw Error('Arquivo GLB inválido');let jsonLength=dv.getUint32(12,true);const info=JSON.parse(new TextDecoder().decode(new Uint8Array(arr,20,jsonLength)));const binStart=20+jsonLength+8;
    const viewBuffer=new Map();function getBuffer(index,target){let key=index+':'+target;if(viewBuffer.has(key))return viewBuffer.get(key);let bv=info.bufferViews[index],buf=gl.createBuffer();gl.bindBuffer(target,buf);gl.bufferData(target,new Uint8Array(arr,binStart+(bv.byteOffset||0),bv.byteLength),gl.STATIC_DRAW);viewBuffer.set(key,buf);return buf}
    function useAttr(index,location){let a=info.accessors[index],v=info.bufferViews[a.bufferView];gl.bindBuffer(gl.ARRAY_BUFFER,getBuffer(a.bufferView,gl.ARRAY_BUFFER));gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,a.type==='VEC3'?3:a.type==='VEC2'?2:1,componentMap[a.componentType],!!a.normalized,v.byteStride||0,a.byteOffset||0);if(location===0&&a.min&&a.max){for(let q=0;q<3;q++){bounds.min[q]=Math.min(bounds.min[q],a.min[q]);bounds.max[q]=Math.max(bounds.max[q],a.max[q])}}}
    info.meshes.forEach(mesh=>mesh.primitives.forEach(p=>{if(p.mode!==undefined&&p.mode!==4)return;if(!p.attributes||p.attributes.POSITION===undefined||p.attributes.NORMAL===undefined||p.indices===undefined)return;const vao=gl.createVertexArray();gl.bindVertexArray(vao);useAttr(p.attributes.POSITION,0);useAttr(p.attributes.NORMAL,1);const acc=info.accessors[p.indices];gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,getBuffer(acc.bufferView,gl.ELEMENT_ARRAY_BUFFER));meshes.push({vao,count:acc.count,type:componentMap[acc.componentType],offset:acc.byteOffset||0});gl.bindVertexArray(null)}));
    if(!meshes.length)throw Error('Malha não suportada');
  }
  let longitude=0.12,pitch=0.06,longitudeTarget=.12,pitchTarget=.06,drag=false,lastX=0,lastY=0;
  host.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId)});
  host.addEventListener('pointermove',e=>{if(!drag)return;longitudeTarget+=(e.clientX-lastX)*.008;pitchTarget=Math.max(-.65,Math.min(.65,pitchTarget+(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY});
  host.addEventListener('pointerup',()=>{drag=false});host.addEventListener('pointercancel',()=>{drag=false});
  const resizer=new ResizeObserver(()=>resize());resizer.observe(host);function resize(){const rect=host.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}}
  let last=0,rotationTime=0;function draw(ms){if(!ready)return;const delta=Math.min(.07,(ms-last)/1000||0);last=ms;rotationTime+=delta;resize();if(!reduce&&!drag)longitudeTarget+=delta*.095;longitude+=(longitudeTarget-longitude)*Math.min(1,delta*5);pitch+=(pitchTarget-pitch)*Math.min(1,delta*5);
    const size=Math.max(...bounds.max.map((v,i)=>v-bounds.min[i]));const mid=bounds.min.map((v,i)=>(v+bounds.max[i])*.5),s=2.0/size;
    const model=multiply(rotateY(longitude),multiply(rotateX(-pitch),multiply(scale(s),translate(-mid[0],-mid[1],-mid[2]))));
    const ratio=canvas.width/canvas.height,projection=perspective(40*Math.PI/180,ratio,.1,30),view=translate(0,0,-4.2),vp=multiply(projection,view);
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.useProgram(program);gl.uniformMatrix4fv(modelLoc,false,model);gl.uniformMatrix4fv(vpLoc,false,vp);gl.uniform3f(eyeLoc,0,0,4.2);gl.uniform1f(timeLoc,rotationTime);
    meshes.forEach(mesh=>{gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.type,mesh.offset)});gl.bindVertexArray(null);
    if(!reduce)raf=requestAnimationFrame(draw)
  }
  async function load(){try{const urls=Array.from({length:13},(_,i)=>'assets/mask/part-'+String(i).padStart(2,'0')+'.b64');const chunks=await Promise.all(urls.map(async u=>{const r=await fetch(u);if(!r.ok)throw Error('Falha ao carregar modelo 3D: '+u);return r.text()}));const binary=atob(chunks.join(''));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));parseGLB(bytes.buffer);ready=true;host.classList.add('is-ready');resize();requestAnimationFrame(draw)}catch(e){console.warn('T&H: modo 3D indisponível; exibindo símbolo de segurança.',e)}}
  load();document.addEventListener('visibilitychange',()=>{if(ready&&!document.hidden&&!reduce){cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(draw)}});
})();
