// mathjax-config.js
let mathJaxIsReady = false;
let resolveMathJaxReady;
const mathJaxReadyPromise = new Promise(resolve => {
    resolveMathJaxReady = resolve;
});

window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
    },
    svg: {
        fontCache: 'global'
    },
    startup: {
        ready: function() {
            console.log('MathJax is ready!');
            mathJaxIsReady = true;
            resolveMathJaxReady();
            MathJax.startup.defaultReady();
        }
    }
};