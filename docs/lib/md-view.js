/* eslint-env es6 */

import few from 'few';
import marked from '//cdn.jsdelivr.net/npm/marked/marked.min';
import hljs from '//cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.15.10/build/highlight.min';

marked.setOptions( {
    langPrefix: 'language-',
    highlight: function( code, lang ) {
        /*
        if ( lang === 'js' ) {
            return hljs.javascript( code );
        } else if ( lang === 'html' ) {
            return hljs.html( code );
        }*/
        // return hljs.highlightAuto( code ).value;
        return hljs.highlight( lang, code ).value;
    }
} );
class MarkdownView extends HTMLElement {
    static get tag() {
        return 'md-view';
    }

    static get observedAttributes() {
        return [ 'src' ];
    }

    constructor() {
        super();

        const shadowRoot = this.shadowRoot || this.attachShadow( { mode: 'open' } );

        // Apply style to shadow DOM
        // let style = document.createElement( 'style' );
        // style.textContent = buttonCss;
        // shadowRoot.appendChild( style );

        const style = document.createElement( 'style' );
        style.textContent = `
    body {
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
        font-size: 16px;
        line-height: 1.5;
        word-wrap: break-word;
        background: #F9F9F9;
    }

    #container {
        max-width: 900px;
        margin: auto;
    }

    #content {
        padding: 5px 10px;
        border: 1px solid #ddd;
        border-radius: 3px;
        background: white;
    }

    #content h1:first-child {
        margin-top: 0px;
    }

    nav {
        border: 1px solid #ddd;
        border-radius: 3px;
        background: white;
        margin-right: 10px;
    }

    nav > ul {
        position: sticky;
        top: 5px;
        margin: 10px 0px;
        padding: 0;
        list-style-type: none;
        font-size: 14px;
    }

    nav > ul > li {
        min-width: 125px;
        padding: 0px 15px;
    }

    nav > ul > li > ul {
        padding-left: 25px;
    }

    nav > ul > li > ul > li {
        font-size: 0.8em;
    }

    nav .selected {
        color: #111;
        font-weight: bold;
    }

    nav .selected:hover {
        text-decoration: none;
    }

    header {
        display: flex;
        height: 50px;
    }

    header h1 { margin: 0; }

    table {
        border-spacing: 0;
        border-collapse: collapse;
        border: 1px solid #ddd;
    }

    td, th {
        border: 1px solid #ddd;
        padding: 5px;
    }

    a {
        color: #0366d6;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    pre {
        font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,Courier,monospace;
        padding: 16px;
        overflow: auto;
        /*font-size: 85%;*/
        line-height: 1.45;
        background-color: #f6f8fa;
        border-radius: 3px;
    }

    code:not([class]) {
        font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,Courier,monospace;
        padding: 0.2em 0.4em;
        margin: 0;
        /*font-size: 85%;
        background-color: rgba(27,31,35,0.05);*/
        border-radius: 3px;
    }

        `;

        this._contentDOM = document.createElement( 'div' );
        shadowRoot.appendChild( style );
        shadowRoot.appendChild( this._contentDOM );

        // Add highlightJs css
        // <link rel="stylesheet" href="//cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.15.10/build/styles/default.min.css">
        let hightlightCss = document.createElement( 'link' );
        hightlightCss.rel = 'stylesheet';
        hightlightCss.href = 'css/github.css';
        shadowRoot.appendChild( hightlightCss );


        hljs.initHighlightingOnLoad();
    }

    attributeChangedCallback( name, oldValue, newValue ) {
        // console.log( `${name}: ${oldValue} => ${newValue}` );

        if ( name === 'src' && newValue && oldValue !== newValue ) {
            // do nothing
            few.httpGet( `${newValue}.md` ).then( ( content ) => {
                this._contentDOM.innerHTML = marked( content );
            } );
        }
    }
}

customElements.define( MarkdownView.tag, MarkdownView );
