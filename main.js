window.onload = () => {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./sw.js');
  }
    camStart();
}
// Override the function with all the posibilities
navigator.getUserMedia || (navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia);
var gl;
var canvas;
var Param1 = 0.0;
var Param2 = 0.0;
var Param3 = 0.0;
var mouseX = 0.5;
var mouseY = 0.5;
var direction = 1.0;
var keyState1 = 0;
var keyState2 = 0;
var keyState3 = 0;
var keyState4 = 0;

function initGL() {
	try {
		gl = canvas.getContext("experimental-webgl");
	} catch (e) {}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}
	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}
	var shader;
	if (shaderScript.type == "f") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "v") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}
var programsArray = new Array();
var current_program;

function initShaders() {
	programsArray.push(createProgram("shader-vs", "shader-1-fs"));
	programsArray.push(createProgram("shader-vs", "shader-2-fs"));
	programsArray.push(createProgram("shader-vs", "shader-3-fs"));
	programsArray.push(createProgram("shader-vs", "shader-4-fs"));
	current_program = programsArray[0];
}

function createProgram(vertexShaderId, fragmentShaderId) {
	var shaderProgram;
	var fragmentShader = getShader(gl, fragmentShaderId);
	var vertexShader = getShader(gl, vertexShaderId);
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}
	gl.useProgram(shaderProgram);
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "texture0");
	shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, "resolution");
	shaderProgram.mouse = gl.getUniformLocation(shaderProgram, "mouse");
	shaderProgram.indexUniform = gl.getUniformLocation(shaderProgram, "index");
	shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");
	shaderProgram.Param1 = gl.getUniformLocation(shaderProgram, "Param1");
	shaderProgram.Param2 = gl.getUniformLocation(shaderProgram, "Param2");
	shaderProgram.Param3 = gl.getUniformLocation(shaderProgram, "Param3");
	return shaderProgram;
}
var webcam;
var texture;

function initTexture() {
	texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);
}
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}

function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}
var ix = 0;
var frame_num = 0.0;
var end;
var st = new Date().getTime();

function setUniforms() {
	end = new Date().getTime();
	gl.uniformMatrix4fv(current_program.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(current_program.mvMatrixUniform, false, mvMatrix);
	gl.uniform2f(current_program.resolutionUniform, canvas.width, canvas.height);
	gl.uniform2f(current_program.mouse, 1.0 - mouseX, 1.0 - mouseY);
	gl.uniform1i(current_program.indexUniform, ix);
	if (direction == 1)
		//        		gl.uniform1f(current_program.time, performance.now()/1000.0);
		gl.uniform1f(current_program.time, ((end - st) % 1000000) / 1000.0);
	else
		//        		gl.uniform1f(current_program.time, -performance.now()/1000.0);
		gl.uniform1f(current_program.time, -((end - st) % 1000000) / 1000.0);
	gl.uniform1f(current_program.Param1, Param1);
	gl.uniform1f(current_program.Param2, Param2);
	gl.uniform1f(current_program.Param3, Param3);
}
var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
	cubeVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	cubeVertexPositionBuffer.itemSize = 2;
	cubeVertexPositionBuffer.numItems = 4;
	cubeVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	var textureCoords = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	cubeVertexTextureCoordBuffer.itemSize = 2;
	cubeVertexTextureCoordBuffer.numItems = 4;
	cubeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	var cubeVertexIndices = [0, 1, 2, 0, 2, 3];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
	cubeVertexIndexBuffer.itemSize = 1;
	cubeVertexIndexBuffer.numItems = 6;
}

function drawScene() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	mat4.ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, pMatrix);
	gl.useProgram(current_program);
	mat4.identity(mvMatrix);
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(current_program.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	gl.vertexAttribPointer(current_program.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcam);
	gl.uniform1i(current_program.samplerUniform, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	setUniforms();
	gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
}
var old_time = Date.now();

function tick() {
	requestAnimFrame(tick);
	drawScene();
}

function webGLStart() {
	canvas = document.getElementById("webgl-canvas");
	canvas.width = 1024;
	canvas.height = 1024;
	initGL();
	initShaders();
	initBuffers();
	initTexture();
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	tick();
}
var ixMax = 2;

function ixCount(i) {
	switch (i) {
		case 1:
			return 4;
			break;
		case 2:
			return 4;
			break;
		case 3:
			return 4;
			break;
		case 4:
			return 4;
			break;
	}
}
var effectSet = 0;

function processing_changer() {}

function MonitorKeyUp(e) {
	if (!e) e = window.event;
	if (e.keyCode == 32 || e.keyCode == 49) Action(1);
	if (e.keyCode == 50) Action(2);
	if (e.keyCode == 51 || e.keyCode == 13) Action(4);
	if (e.keyCode == 52) Action(3);
	return false;
}

function Action(i) {
	switch (i) {
		case 1:
			ix = ix + 1;
			if (ix > ixMax) ix = 0;
			break;
		case 2:
			ix = ix - 1;
			if (ix < 0) ix = ixMax;
			break;
		case 3:
			effectSet = effectSet + 1;
			if (effectSet > 3) effectSet = 0;
			ix = 0;
			ixMax = ixCount(effectSet + 1);
			current_program = programsArray[effectSet];
			break;
		case 4:
			effectSet = effectSet - 1;
			if (effectSet < 0) effectSet = 3;
			ix = 0;
			ixMax = ixCount(effectSet + 1);
			current_program = programsArray[effectSet];
			break;
	}
}
var mouseState = 0;

function MonitorMouseDown(e) {
	if (!e) e = window.event;
	if (e.button == 0) {
		mouseState = 1;
		mouseX = e.clientX / canvas.scrollWidth;
		mouseY = 1.0 - e.clientY / canvas.scrollHeight;
		direction = 1 - direction;
	}
	return false;
}

function MonitorMouseUp(e) {
	if (!e) e = window.event;
	if (e.button == 0) {
		mouseState = 0;
	}
	return false;
}

function camStart() {
	//      var button = document.querySelector('button');
	var splash = document.querySelector('splash');
	var buttonRight = document.querySelector('buttonRight');
	var buttonLeft = document.querySelector('buttonLeft');
	var buttonUp = document.querySelector('buttonUp');
	var buttonDown = document.querySelector('buttonDown');
	splash.onclick = function(e) {
		// if (document.body.requestFullscreen) {
		//   document.body.requestFullscreen();
		// } else if (document.body.msRequestFullscreen) {
		//   document.body.msRequestFullscreen();
		// } else if (document.body.mozRequestFullScreen) {
		//   document.body.mozRequestFullScreen();
		// } else if (document.body.webkitRequestFullscreen) {
		//   document.body.webkitRequestFullscreen();
		// }
		webcam = document.createElement('video'); //getElementById('webcam');
		navigator.getUserMedia({
			video: true,
			audio: false
		}, onSuccess, onError);
		splash.hidden = true;
	}
		//window.setTimeout(function() {splash.hidden = true;}, 2500); // hide Splash screen after 2.5 seconds


	//        button.onclick=function(e){
	//        }
	document.onkeydown = function(e) {
		if (e.keyCode == 32 || e.keyCode == 49) {
			if (keyState1 == 0) Action(1);
			keyState1 = 1;
		} else if (e.keyCode == 50) {
			if (keyState2 == 0) Action(2);
			keyState2 = 1;
		} else if (e.keyCode == 51 || e.keyCode == 13) {
			if (keyState3 == 0) Action(3);
			keyState3 = 1;
		} else if (e.keyCode == 52) {
			if (keyState4 == 0) Action(4);
			keyState4 = 1;
		}
	}
	document.onkeyup = function(e) {
		if (e.keyCode == 32 || e.keyCode == 49) {
			keyState1 = 0;
		} else if (e.keyCode == 50) {
			keyState2 = 0;
		} else if (e.keyCode == 51 || e.keyCode == 13) {
			keyState3 = 0;
		} else if (e.keyCode == 52) {
			keyState4 = 0;
		}
	}
	buttonRight.onclick = function(e) {
		Action(1);
	}
	buttonLeft.onclick = function(e) {
		Action(2);
	}
	buttonUp.onclick = function(e) {
		Action(3);
	}
	buttonDown.onclick = function(e) {
		Action(4);
	}
}

function onSuccess(stream) {
	var videoSource;
	//      if (window.webkitURL) {
	//         videoSource = window.webkitURL.createObjectURL(stream);
	//      } else if (window.URL) {
	//         videoSource = window.URL.createObjectURL(stream);
	//      } else {
	//         videoSource = stream;
	//      }
	//      webcam.src = videoSource;
	webGLStart();
	webcam.srcObject = stream;
	webcam.play();

	canvas.onmousedown = MonitorMouseDown;
	canvas.onmousedown = MonitorMouseDown;
	canvas.onmouseup = MonitorMouseUp;
	canvas.onmousemove = function(e) {
		e = e || window.event;
		if (mouseState == 1) {
			mouseX = (mouseX + 7.0 * e.clientX / canvas.scrollWidth) / 8.0;
			mouseY = (mouseY + 7.0 * (1.0 - e.clientY / canvas.scrollHeight)) / 8.0;
		}
	}


	canvas.ontouchstart = function(e) {
		e.preventDefault();
		var touchs = e.changedTouches;
		mouseX = touchs[0].clientX/canvas.scrollWidth;
		mouseY = 1.0-touchs[0].clientY/canvas.scrollHeight;
	};
	canvas.ontouchend = function(e) {
		e.preventDefault();
	};
	canvas.ontouchmove = function(e) {
		e.preventDefault();
		var touches = e.changedTouches;
		mouseX = touches[0].clientX/canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
		mouseY = 1.0-touches[0].clientY/canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
	};
	canvas.ontouchstart = function(e) {
		e.preventDefault();
		var touchs = e.changedTouches;
		mouseX = touchs[0].clientX / canvas.scrollWidth;
		mouseY = 1.0 - touchs[0].clientY / canvas.scrollHeight;
		direction = 1 - direction;
	};
	canvas.ontouchmove = function(e) {
		e.preventDefault();
		var touches = e.changedTouches;
		mouseX = touches[0].clientX / canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
		mouseY = 1.0 - touches[0].clientY / canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
	};
}

function onError() {
	alert('There has been a problem retreiving the streams - are you running on file:/// or did you disallow access?');
}