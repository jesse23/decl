/* eslint-env es6 */

import _ from 'lodash';
import {
    hasScope,
    evalExpression,
    parseViewToDiv
} from './few-utils';

export default class FewDom {
    /**
     * Create FewDom structure based on input DOM
     * @param {Node} node DOM Node
     * @param {StringTemplateParser} parser string template parser function
     * @param {number} level level for current element input
     * @returns {Object} FewDom object
     */
    static createFewDom( node, parser, level = 0 ) {
        if(  node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.ELEMENT_NODE ||
            // has scope defined already
            hasScope( node ) ) {
            return;
        }

        let obj = new FewDom( node.nodeName );
        obj.hasExpr = false;

        // TODO: need to refactor
        let skipChild = false;

        if( node.nodeType === Node.ELEMENT_NODE && node.getAttribute( 'v-for' ) ) {
            let vForExpr = node.getAttribute( 'v-for' );
            let match = vForExpr.match( /^\s*(\S+)\s+(in|of)\s+(\S+)\s*$/ );
            let vVarName = match[1];
            let vSetName = match[3];
            node.removeAttribute( 'v-for' );
            // obj._renderFuncExpr = `${vSetName}.map((${vVarName}) => { return \`` + node.outerHTML + '`; }).join("");';
            obj.hasExpr = true;
            skipChild = true;
            obj._renderFunc = ( vm ) => {
                let content = vm[vSetName].map( ( o ) => {
                    let vVar = {};
                    vVar[vVarName] = o;
                    // TODO: If the pattern is not ${}, it will break. Need to use this.createHtmlDom( vm )
                    return evalExpression( '`' + node.outerHTML + '`', Object.assign( Object.assign( {}, vm ), vVar ), true );
                } ).join( '' );

                content = content ? content : '<!-- v-for is empty -->';
                let parent = obj._htmlDomReference.parentNode;
                let oldHtml = parent.innerHTML;
                if ( !_.isEqual( oldHtml, content ) ) {
                    parent.innerHTML = content;
                    obj._htmlDomReference = parent.firstChild;
                }
            };
            // For now not set hasExpr = true.
        } else if( node.nodeType === Node.ELEMENT_NODE && node.getAttribute( 'v-if' ) ) {
            let vIfExpr = node.getAttribute( 'v-if' );
            node.removeAttribute( 'v-if' );
            obj.hasExpr = true;
            skipChild = true;
            obj._renderFunc = ( vm ) => {
                let currNode = obj._htmlDomReference;
                let parentNode = currNode.parentNode;
                let vIfRes = evalExpression( vIfExpr, vm, true );
                if ( obj.values['v-if'] === undefined || obj.values['v-if'] !== Boolean( vIfRes ) ) {
                    if( vIfRes ) {
                        // TODO: If the pattern is not ${}, it will break. Need to use this.createHtmlDom( vm )
                        let content = evalExpression( '`' + node.outerHTML + '`', vm, true );
                        let newNode = parseViewToDiv( content ).firstChild;
                        parentNode.replaceChild( newNode, currNode );
                        obj._htmlDomReference = newNode;
                    } else {
                       let newNode = document.createComment( `v-if ${vIfExpr} = ${vIfRes}` );
                        parentNode.replaceChild( newNode, currNode );
                        obj._htmlDomReference = newNode;
                    }
                }
                obj.values['v-if'] = Boolean( vIfRes );
            };
            obj._htmlDomReference = node;
        } else if ( obj.isTextNode() ) {
            let name = 'textContent';
            let value = node[name];
            // TODO: we can do it better later
            let expr = parser.parse( value );
            if( expr ) {
                obj.addProperty( name, expr );
                obj.hasExpr = true;

                obj._renderFunc = ( vm ) => {
                    let res = evalExpression( obj.props[name], vm, true );
                    if ( !_.isEqual( obj.values[name], res ) ) {
                        obj.values[name] = res;
                        obj._htmlDomReference[name] = res;
                    }
                };
            }
            obj.values[name] = value;
        } else {
            for( let i = 0; i < node.attributes.length; i++ ) {
                let name = node.attributes[i].name;
                let value = node.attributes[i].value;
                // TODO: we can do it better later
                let expr = parser.parse( value );
                if( expr ) {
                    // if name is event like onclick
                    // TODO: make it as expression later
                    if ( /^on.+/.test( name ) ) {
                        node.setAttribute( name, `few.handleEvent(this, '${expr}', event)` );
                    } else {
                        obj.addProperty( name, expr );
                        obj.hasExpr = true;
                    }
                }
                obj.values[name] = value;
            }


            obj._renderFunc = ( vm ) => {
                _.forEach( obj.props, ( value, name ) => {
                    let res = evalExpression( value, vm, true );
                    // TODO: maybe string comparison will be better?
                    if ( !_.isEqual( obj.values[name], res ) ) {
                        obj.values[name] = res;
                        obj._htmlDomReference.setAttribute( name, res );
                    }
                } );

                for( let child of obj.children ) {
                    child.render( vm );
                }
            };
        }

        if ( obj.hasExpr || level === 0 ) {
            obj._htmlDomReference = node;
        }

        for ( let i = 0; !skipChild && i < node.childNodes.length; i++ ) {
            let child = node.childNodes[i];
            let childNode = FewDom.createFewDom( child, parser, level + 1 );
            if( childNode ) {
                obj.addChild( childNode );
                obj.hasExpr = obj.hasExpr ? obj.hasExpr : childNode.hasExpr;
            }
        }

        return obj;
    }

    /**
     * Create VirtualDomElement
     * @param {string} tagName DOM Element tag name
     * @param {Object} props DOM attributes
     * @param {Array} children child elements
     */
    constructor( tagName, props = {}, children = [] ) {
        this.tagName = tagName;
        this.props = props;
        this.values = {};
        this.children = children;
        this.hasExpr = false;
        this._htmlDomReference = null;
    }

    /**
     * Add DOM Attribute
     * @param {string} name attribute name
     * @param {string} val attribute value
     */
    addProperty( name, val ) {
        this.props[name] = val;
    }

    /**
     * Add child element
     * @param {VirtualDomElement} child child element
     */
    addChild( child ) {
        this.children.push( child );
    }

    /**
     * Add child elements
     * @param {VirtualDomElement} children child elements
     */
    addChildren( children ) {
        this.children = this.children.concat( children );
    }

    /**
     * get DOM element for current view element
     * @returns {Element} DOM element for current view element
     */
    getDomElement() {
        return this._htmlDomReference;
    }

    /**
     * Check if current FewDom object is text node
     * @returns {boolean} return true if the FewDom object is for text node
     */
    isTextNode() {
        return this.tagName === '#text';
    }


    /**
     * render view based on view model object
     * @param {FewComponent} vm view model object
     */
    render( vm ) {
        if( this.hasExpr && this._renderFunc ) {
            this._renderFunc( vm );
        }
    }

    /**
     * Refresh/create HTML DOM for current FewDOM
     * @param {FewComponent} vm view model object
     * @returns {Node} HTML dom Node
     */
    createHtmlDom( vm ) {
        let newNode = null;
        if( this.isTextNode() ) {
            newNode = document.createTextNode( this.values.textContent );
        } else {
            newNode = document.createElement( this.tagName );
            _.forEach( this.values, ( expr, attr ) => {
                newNode.setAttribute( attr, this.values[attr] );
            } );
            _.forEach( this.children, ( c ) => {
                newNode.appendChild( c.createHtmlDom( vm ) );
            } );
        }

        this._htmlDomReference = newNode;
        return newNode;
    }

    /**
     * Print object for test purpose
     * @returns {JSON} JSON object that presents the content of FewDom
     */
    toJson() {
        let refStr = '';
        if( this._htmlDomReference ) {
            if( this.isTextNode() ) {
                refStr = this._htmlDomReference.nodeValue;
            } else {
                let node = this._htmlDomReference.cloneNode();
                if( this._htmlDomReference.children && this._htmlDomReference.children.length > 0 ) {
                    node.innerHTML = '';
                }
                // nodeValue
                refStr = node.outerHTML;
            }
        }

        let obj = Object.assign( {}, this );
        obj._htmlDomReference = refStr;
        obj.children = this.children.map( ( o ) => o.toJson() );
        delete obj._renderFunc;

        // wash out methods
        return obj;
    }
}
