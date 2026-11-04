<template><span hidden></span></template>

<script setup lang="ts">
import type { Map as LeafletMap } from 'leaflet';
import type { MapRegion } from '@inteyvat-wiki/wiki-contracts/map';
const props = defineProps<{ map: LeafletMap; mesh: NonNullable<MapRegion['mesh']> }>();
let canvas: HTMLCanvasElement | undefined, gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null, vertices: WebGLBuffer | null = null, indices: WebGLBuffer | null = null, texture: WebGLTexture | null = null;
let loaded = false, disposed = false, image: HTMLImageElement | undefined;
function shader(type: number, source: string) {
    const value = gl!.createShader(type)!; gl!.shaderSource(value, source); gl!.compileShader(value);
    if (!gl!.getShaderParameter(value, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(value) || 'Map shader compilation failed');
    return value;
}
function paint() {
    if (!canvas || !gl || !program || !loaded || disposed) return;
    const size = props.map.getSize(), scale = window.devicePixelRatio || 1;
    const origin = props.map.containerPointToLayerPoint([0, 0]), pixelOrigin = props.map.getPixelOrigin();
    canvas.style.transform = `translate(${origin.x}px,${origin.y}px)`;
    canvas.style.width = `${size.x}px`; canvas.style.height = `${size.y}px`;
    canvas.width = Math.round(size.x * scale); canvas.height = Math.round(size.y * scale);
    canvas.style.mixBlendMode = props.mesh.blend === 'additive' ? 'plus-lighter' : 'normal';
    canvas.style.zIndex = String(props.mesh.zIndex);
    const buffer = new Float32Array(props.mesh.vertices.length * 4);
    props.mesh.vertices.forEach((point, index) => {
        const projected = props.map.project([point.x, -point.y], props.map.getZoom());
        buffer[index * 4] = 2 * (projected.x - pixelOrigin.x - origin.x) / size.x - 1;
        buffer[index * 4 + 1] = 1 - 2 * (projected.y - pixelOrigin.y - origin.y) / size.y;
        buffer[index * 4 + 2] = props.mesh.uv[index]![0]; buffer[index * 4 + 3] = props.mesh.uv[index]![1];
    });
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, vertices); gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'), uv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, 'picture'), 0);
    gl.uniform4f(gl.getUniformLocation(program, 'tint'), ...props.mesh.color, props.mesh.opacity);
    // Browser compositing supplies source-alpha and the requested blend with
    // the underlying map. The framebuffer itself retains straight RGBA.
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST);
    gl.drawElements(gl.TRIANGLES, props.mesh.triangles.length * 3, gl.UNSIGNED_SHORT, 0);
}
function load() {
    if (!gl || !indices) return;
    if (props.mesh.vertices.length > 65535) throw new Error('Map mesh exceeds the supported vertex count');
    loaded = false; gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(props.mesh.triangles.flat()), gl.STATIC_DRAW);
    if (image) image.onload = null;
    image = new Image();
    image.onload = () => {
        if (disposed || !gl || !image) return;
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        loaded = true; paint();
    };
    image.src = props.mesh.texture;
}
onMounted(() => {
    canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', transformOrigin: '0 0' });
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) throw new Error('WebGL is required to display this map mesh');
    program = gl.createProgram()!;
    const vertex = shader(gl.VERTEX_SHADER, 'attribute vec2 position; attribute vec2 uv; varying vec2 texcoord; void main(){gl_Position=vec4(position,0.0,1.0);texcoord=uv;}');
    const fragment = shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 texcoord; uniform sampler2D picture; uniform vec4 tint; void main(){gl_FragColor=texture2D(picture,texcoord)*tint;}');
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Map mesh program linking failed');
    vertices = gl.createBuffer(); indices = gl.createBuffer(); texture = gl.createTexture();
    props.map.getPanes().overlayPane.appendChild(canvas); props.map.on('move zoom viewreset resize', paint); load();
});
watch(() => props.mesh, load);
onBeforeUnmount(() => {
    disposed = true; props.map.off('move zoom viewreset resize', paint); if (image) image.onload = null;
    if (gl) { gl.deleteBuffer(vertices); gl.deleteBuffer(indices); gl.deleteTexture(texture); gl.deleteProgram(program); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    canvas?.remove(); canvas = undefined; gl = null;
});
</script>
