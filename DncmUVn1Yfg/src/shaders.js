export const simulationVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const simulationFragmentShader = `
uniform sampler2D uTextureA;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uTime;
uniform int uFrame;
varying vec2 vUv;

const float delta = 1.4;

void main() {
    vec2 uv = vUv;
    if (uFrame == 0) {
        gl_FragColor = vec4(0.0);
        return;
    }
    vec4 data = texture2D(uTextureA, uv);
    float pressure = data.x;
    float pVel = data.y;

    vec2 texelSize = 1.0 / uResolution;
    float p_right = texture2D(uTextureA, uv + vec2(texelSize.x, 0.0)).x;
    float p_left  = texture2D(uTextureA, uv + vec2(-texelSize.x, 0.0)).x;
    float p_up    = texture2D(uTextureA, uv + vec2(0.0, texelSize.y)).x;
    float p_down  = texture2D(uTextureA, uv + vec2(0.0, -texelSize.y)).x;

    if (uv.x <= texelSize.x) p_left = p_right;
    if (uv.x >= 1.0 - texelSize.x) p_right = p_left;
    if (uv.y <= texelSize.y) p_up = p_down;
    if (uv.y >= 1.0 - texelSize.y) p_down = p_up;

    // Enhanced wave equation matching ShaderToy
    pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
    pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;

    pressure += delta * pVel;
    pVel -= 0.005 * delta * pressure;
    pVel *= 1.0 - 0.002 * delta;
    pressure *= 0.999;

    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 mouseUV = uMouse;
    if(uMouse.x > 0.0) {
        float dist = distance((uv - mouseUV) * aspect, vec2(0.0));
        if(dist <= 0.02) {
            pressure += 2.0 * (1.0 - dist / 0.02);
        }
    }

    gl_FragColor = vec4(pressure, pVel,
        (p_right - p_left) / 2.0,
        (p_up - p_down) / 2.0);
}
`;

export const renderVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const renderFragmentShader = `
uniform sampler2D uTextureA;
uniform sampler2D uTextureB;
varying vec2 vUv;

void main() {
    vec4 data = texture2D(uTextureA, vUv);
    vec2 distortion = 0.3 * data.zw;
    vec4 color = texture2D(uTextureB, vUv + distortion);

    vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
    vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
    float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.5;

    gl_FragColor = color + vec4(specular);
}
`;
