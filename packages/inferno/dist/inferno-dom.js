/*!
 * inferno-dom v0.6.5
 * (c) 2016 Dominic Gannaway
 * Released under the MPL-2.0 License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.InfernoDOM = factory());
}(this, function () { 'use strict';

	var babelHelpers = {};
	babelHelpers.typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
	  return typeof obj;
	} : function (obj) {
	  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
	};

	babelHelpers.classCallCheck = function (instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	};

	babelHelpers.createClass = function () {
	  function defineProperties(target, props) {
	    for (var i = 0; i < props.length; i++) {
	      var descriptor = props[i];
	      descriptor.enumerable = descriptor.enumerable || false;
	      descriptor.configurable = true;
	      if ("value" in descriptor) descriptor.writable = true;
	      Object.defineProperty(target, descriptor.key, descriptor);
	    }
	  }

	  return function (Constructor, protoProps, staticProps) {
	    if (protoProps) defineProperties(Constructor.prototype, protoProps);
	    if (staticProps) defineProperties(Constructor, staticProps);
	    return Constructor;
	  };
	}();

	babelHelpers.extends = Object.assign || function (target) {
	  for (var i = 1; i < arguments.length; i++) {
	    var source = arguments[i];

	    for (var key in source) {
	      if (Object.prototype.hasOwnProperty.call(source, key)) {
	        target[key] = source[key];
	      }
	    }
	  }

	  return target;
	};

	babelHelpers;

	function Lifecycle() {
		this._listeners = [];
	}

	Lifecycle.prototype = {
		addListener: function addListener(callback) {
			this._listeners.push(callback);
		},
		trigger: function trigger() {
			for (var i = 0; i < this._listeners.length; i++) {
				this._listeners[i]();
			}
		}
	};

	function diffChildren(lastNode, nextNode, dom, namespace, lifecycle, context, instance, staticCheck) {
		var nextChildren = nextNode.children;
		var lastChildren = lastNode.children;

		if (lastChildren === nextChildren) {
			return;
		}

		var domChildren = null;

		if (lastNode.domChildren) {
			domChildren = nextNode.domChildren = lastNode.domChildren;
		}
		if (isInvalidNode(lastChildren)) {
			if (isStringOrNumber(nextChildren)) {
				updateTextNode(dom, lastChildren, nextChildren);
			} else if (!isNullOrUndefined(nextChildren)) {
				if (isArray(nextChildren)) {
					mountArrayChildren(nextNode, nextChildren, dom, namespace, lifecycle, context, instance);
				} else {
					mountNode(nextChildren, dom, namespace, lifecycle, context, instance);
				}
			}
		} else {
			if (isInvalidNode(nextChildren)) {
				dom.textContent = '';
			} else {
				if (isArray(lastChildren)) {
					if (isArray(nextChildren)) {
						if (domChildren === null && lastChildren.length > 1) {
							patchKeyedChildren(lastChildren, nextChildren, dom, namespace, lifecycle, context, instance);
						} else {
							if (isKeyed(lastChildren, nextChildren)) {
								patchKeyedChildren(lastChildren, nextChildren, dom, namespace, lifecycle, context, instance);
							} else {
								patchNonKeyedChildren(lastChildren, nextChildren, dom, domChildren || (nextNode.domChildren = []), namespace, lifecycle, context, instance, 0);
							}
						}
					} else {
						patchNonKeyedChildren(lastChildren, [nextChildren], dom, domChildren || [], namespace, lifecycle, context, instance, 0);
					}
				} else {
					if (isArray(nextChildren)) {
						patchNonKeyedChildren([lastChildren], nextChildren, dom, domChildren || (nextNode.domChildren = [dom.firstChild]), namespace, lifecycle, context, instance, 0);
					} else if (isStringOrNumber(nextChildren)) {
						updateTextNode(dom, lastChildren, nextChildren);
					} else if (isStringOrNumber(lastChildren)) {
						patchNode(lastChildren, nextChildren, dom, namespace, lifecycle, context, instance, null);
					} else {
						patchNode(lastChildren, nextChildren, dom, namespace, lifecycle, context, instance, staticCheck);
					}
				}
			}
		}
	}

	function diffRef(instance, lastValue, nextValue, dom) {
		if (instance) {
			if (isString(lastValue)) {
				delete instance.refs[lastValue];
			}
			if (isString(nextValue)) {
				instance.refs[nextValue] = dom;
			}
		}
	}

	function diffEvents(lastNode, nextNode, dom) {
		var nextEvents = nextNode.events;
		var lastEvents = lastNode.events;
		var nextEventsDefined = !isNullOrUndefined(nextEvents);
		var lastEventsDefined = !isNullOrUndefined(lastEvents);

		if (nextEventsDefined) {
			if (lastEventsDefined) {
				patchEvents(lastEvents, nextEvents, dom);
			} else {
				mountEvents(nextEvents, dom);
			}
		} else if (lastEventsDefined) {
			removeEvents(lastEvents, dom);
		}
	}

	function diffAttributes(lastNode, nextNode, dom, instance) {
		if (lastNode.tag === 'select') {
			selectValue(nextNode);
		}
		var nextAttrs = nextNode.attrs;
		var lastAttrs = lastNode.attrs;
		var nextAttrsIsUndef = isNullOrUndefined(nextAttrs);
		var lastAttrsIsUndef = isNullOrUndefined(lastAttrs);

		if (!nextAttrsIsUndef) {
			var nextAttrsKeys = Object.keys(nextAttrs);
			var attrKeysLength = nextAttrsKeys.length;

			for (var i = 0; i < attrKeysLength; i++) {
				var attr = nextAttrsKeys[i];
				var lastAttrVal = !lastAttrsIsUndef && lastAttrs[attr];
				var nextAttrVal = nextAttrs[attr];

				if (lastAttrVal !== nextAttrVal) {
					if (attr === 'ref') {
						diffRef(instance, lastAttrVal, nextAttrVal, dom);
					} else {
						patchAttribute(attr, nextAttrVal, dom);
					}
				}
			}
		}
		if (!lastAttrsIsUndef) {
			var lastAttrsKeys = Object.keys(lastAttrs);
			var _attrKeysLength = lastAttrsKeys.length;

			for (var _i = 0; _i < _attrKeysLength; _i++) {
				var _attr = lastAttrsKeys[_i];

				if (nextAttrsIsUndef || isNullOrUndefined(nextAttrs[_attr])) {
					if (_attr === 'ref') {
						diffRef(instance, lastAttrs[_attr], null, dom);
					} else {
						dom.removeAttribute(_attr);
					}
				}
			}
		}
	}

	function diffNodesWithTemplate(lastNode, nextNode, lastTpl, nextTpl, parentDom, namespace, lifecycle, context, instance, deepCheck) {
		var nextHooks = void 0;

		if (nextNode.hasHooks === true && (nextHooks = nextNode.hooks && !isNullOrUndefined(nextHooks.willUpdate))) {
			nextHooks.willUpdate(lastNode.dom);
		}
		var nextTag = nextNode.tag || deepCheck && lastTpl.tag;
		var lastTag = lastNode.tag || deepCheck && nextTpl.tag;

		if (lastTag !== nextTag) {
			if (lastNode.tpl.isComponent === true) {
				var lastNodeInstance = lastNode.instance;

				if (nextTpl.isComponent === true) {
					replaceNode(lastNodeInstance || lastNode, nextNode, parentDom, namespace, lifecycle, context, instance);
				} else if (isStatefulComponent(lastTag)) {
					diffNodes(lastNodeInstance._lastNode, nextNode, parentDom, namespace, lifecycle, context, instance, true);
				} else {
					diffNodes(lastNodeInstance, nextNode, parentDom, namespace, lifecycle, context, instance, true);
				}
			} else {
				replaceNode(lastNode, nextNode, parentDom, namespace, lifecycle, context, instance);
			}
		} else if (isNullOrUndefined(lastTag)) {
			nextNode.dom = lastNode.dom;
		} else {
			if (lastTpl.isComponent === true) {
				if (nextTpl.isComponent === true) {
					nextNode.instance = lastNode.instance;
					nextNode.dom = lastNode.dom;
					patchComponent(nextNode, nextNode.tag, nextNode.instance, lastNode.attrs || {}, nextNode.attrs || {}, nextNode.hooks, nextNode.children, parentDom, lifecycle, context);
				}
			} else {
				var dom = lastNode.dom;
				var lastChildrenType = lastTpl.childrenType;
				nextNode.dom = dom;

				if (lastChildrenType > 0) {
					var nextChildrenType = nextTpl.childrenType;

					if (lastChildrenType === 4) {
						if (nextChildrenType === 4) {
							patchKeyedChildren(lastNode.children, nextNode.children, dom, namespace, lifecycle, context, instance);
						}
					} else if (lastChildrenType === 2) {
						if (nextChildrenType === 2) {
							patchNode(lastNode.children, nextNode.children, dom, namespace, lifecycle, context, instance, staticCheck);
						}
					} else if (lastChildrenType === 1) {
						if (nextChildrenType === 1) {
							updateTextNode(dom, lastNode.children, nextNode.children);
						}
					} else {
						diffChildren(lastNode, nextNode, dom, namespace, lifecycle, context, instance, staticCheck);
					}
				}
				if (lastTpl.hasAttrs === true) {
					diffAttributes(lastNode, nextNode, dom, instance);
				}
				if (lastTpl.hasEvents === true) {
					diffEvents(lastNode, nextNode, dom);
				}
				if (lastTpl.hasClassName === true) {
					var nextClassName = nextNode.className;

					if (lastNode.className !== nextClassName) {
						if (isNullOrUndefined(nextClassName)) {
							dom.removeAttribute('class');
						} else {
							dom.className = nextClassName;
						}
					}
				}
				if (lastTpl.hasStyle === true) {
					var nextStyle = nextNode.style;

					if (lastNode.style !== nextStyle) {
						patchStyle(lastNode.style, nextStyle, dom);
					}
				}
				if (nextNode.hasHooks === true && !isNullOrUndefined(nextHooks.didUpdate)) {
					nextHooks.didUpdate(dom);
				}
			}
		}
	}

	function diffNodes(lastNode, nextNode, parentDom, namespace, lifecycle, context, instance, deepCheck) {
		if (isPromise(nextNode)) {
			nextNode.then(function (node) {
				diffNodes(lastNode, node, parentDom, namespace, lifecycle, context, deepCheck, instance);
			});
		} else {
			var nextHooks = nextNode.hooks;
			var nextHooksDefined = !isNullOrUndefined(nextHooks);

			if (nextHooksDefined && !isNullOrUndefined(nextHooks.willUpdate)) {
				nextHooks.willUpdate(lastNode.dom);
			}
			var nextTag = nextNode.tag || (deepCheck && !isNullOrUndefined(nextNode.tpl) ? nextNode.tpl.tag : null);
			var lastTag = lastNode.tag || (deepCheck && !isNullOrUndefined(lastNode.tpl) ? lastNode.tpl.tag : null);

			namespace = namespace || nextTag === 'svg' ? SVGNamespace : nextTag === 'math' ? MathNamespace : null;

			if (lastTag !== nextTag) {
				var lastNodeInstance = lastNode.instance;

				if (isFunction(lastTag)) {
					if (isFunction(nextTag)) {
						replaceNode(lastNodeInstance || lastNode, nextNode, parentDom, namespace, lifecycle, context, instance);
					} else if (isStatefulComponent(lastTag)) {
						diffNodes(lastNodeInstance._lastNode, nextNode, parentDom, namespace, lifecycle, context, instance, true);
					} else {
						diffNodes(lastNodeInstance, nextNode, parentDom, namespace, lifecycle, context, instance, true);
					}
				} else {
					replaceNode(lastNodeInstance || lastNode, nextNode, parentDom, namespace, lifecycle, context, instance);
				}
			} else if (isNullOrUndefined(lastTag)) {
				nextNode.dom = lastNode.dom;
			} else {
				if (isFunction(lastTag)) {
					// Firefox doesn't like && too much
					if (isFunction(nextTag)) {
						nextNode.instance = lastNode.instance;
						nextNode.dom = lastNode.dom;
						patchComponent(nextNode, nextNode.tag, nextNode.instance, lastNode.attrs || {}, nextNode.attrs || {}, nextNode.hooks, nextNode.children, parentDom, lifecycle, context);
					}
				} else {
					var dom = lastNode.dom;
					var nextClassName = nextNode.className;
					var nextStyle = nextNode.style;

					nextNode.dom = dom;

					diffChildren(lastNode, nextNode, dom, namespace, lifecycle, context, instance, deepCheck);
					diffAttributes(lastNode, nextNode, dom, instance);
					diffEvents(lastNode, nextNode, dom);

					if (lastNode.className !== nextClassName) {
						if (isNullOrUndefined(nextClassName)) {
							dom.removeAttribute('class');
						} else {
							dom.className = nextClassName;
						}
					}
					if (lastNode.style !== nextStyle) {
						patchStyle(lastNode.style, nextStyle, dom);
					}
					if (nextHooksDefined && !isNullOrUndefined(nextHooks.didUpdate)) {
						nextHooks.didUpdate(dom);
					}
				}
			}
		}
	}

	// Checks if property is boolean type
	function booleanProps(prop) {
		switch (prop.length) {
			case 5:
				return prop === 'value';
			case 7:
				return prop === 'checked';
			case 8:
				return prop === 'disabled' || prop === 'selected';
			default:
				return false;
		}
	}

	function updateTextNode(dom, lastChildren, nextChildren) {
		if (isStringOrNumber(lastChildren)) {
			dom.firstChild.nodeValue = nextChildren;
		} else {
			dom.textContent = nextChildren;
		}
	}

	function patchNode(lastNode, nextNode, parentDom, namespace, lifecycle, context, instance, deepCheck) {
		if (deepCheck !== null) {
			var lastTpl = lastNode.tpl;
			var nextTpl = nextNode.tpl;

			if (lastTpl === undefined) {
				diffNodes(lastNode, nextNode, parentDom, namespace, lifecycle, context, instance, true);
			} else {
				diffNodesWithTemplate(lastNode, nextNode, lastTpl, nextTpl, parentDom, namespace, lifecycle, context, instance, true);
			}
		} else if (isInvalidNode(lastNode)) {
			mountNode(nextNode, parentDom, namespace, lifecycle, context, instance);
		} else if (isInvalidNode(nextNode)) {
			remove(lastNode, parentDom);
		} else if (isStringOrNumber(lastNode)) {
			if (isStringOrNumber(nextNode)) {
				parentDom.firstChild.nodeValue = nextNode;
			} else {
				var dom = mountNode(nextNode, null, namespace, lifecycle, context, instance);
				nextNode.dom = dom;
				parentDom.replaceChild(dom, parentDom.firstChild);
			}
		} else if (isStringOrNumber(nextNode)) {
			var textNode = document.createTextNode(nextNode);
			parentDom.replaceChild(textNode, lastNode.dom);
		} else {
			var _lastTpl = lastNode.tpl;
			var _nextTpl = nextNode.tpl;
			var _deepCheck = _lastTpl !== _nextTpl;

			if (_lastTpl === undefined) {
				diffNodes(lastNode, nextNode, parentDom, namespace, lifecycle, context, instance, _deepCheck);
			} else {
				diffNodesWithTemplate(lastNode, nextNode, _lastTpl, _nextTpl, parentDom, namespace, lifecycle, context, instance, _deepCheck);
			}
		}
	}

	function patchStyle(lastAttrValue, nextAttrValue, dom) {
		if (isString(nextAttrValue)) {
			dom.style.cssText = nextAttrValue;
		} else if (isNullOrUndefined(lastAttrValue)) {
			if (!isNullOrUndefined(nextAttrValue)) {
				var styleKeys = Object.keys(nextAttrValue);

				for (var i = 0; i < styleKeys.length; i++) {
					var style = styleKeys[i];
					var value = nextAttrValue[style];

					dom.style[style] = value;
				}
			}
		} else if (isNullOrUndefined(nextAttrValue)) {
			dom.removeAttribute('style');
		} else {
			var _styleKeys = Object.keys(nextAttrValue);

			for (var _i = 0; _i < _styleKeys.length; _i++) {
				var _style = _styleKeys[_i];
				var _value = nextAttrValue[_style];

				dom.style[_style] = _value;
			}
			// TODO: possible optimization could be we remove all and add all from nextKeys then we can skip this obj loop
			// TODO: needs performance benchmark
			var lastStyleKeys = Object.keys(lastAttrValue);

			for (var _i2 = 0; _i2 < lastStyleKeys.length; _i2++) {
				var _style2 = lastStyleKeys[_i2];
				if (isNullOrUndefined(nextAttrValue[_style2])) {
					dom.style[_style2] = '';
				}
			}
		}
	}

	function patchEvents(lastEvents, nextEvents, dom) {
		var nextEventKeys = Object.keys(nextEvents);

		for (var i = 0; i < nextEventKeys.length; i++) {
			var event = nextEventKeys[i];
			var lastEvent = lastEvents[event];
			var nextEvent = nextEvents[event];

			if (lastEvent !== nextEvent) {
				dom[event] = nextEvent;
			}
		}
		var lastEventKeys = Object.keys(lastEvents);

		for (var _i3 = 0; _i3 < lastEventKeys.length; _i3++) {
			var _event = lastEventKeys[_i3];

			if (isNullOrUndefined(nextEvents[_event])) {
				dom[_event] = null;
			}
		}
	}

	function patchAttribute(attrName, nextAttrValue, dom) {
		if (!isAttrAnEvent(attrName)) {
			if (booleanProps(attrName)) {
				dom[attrName] = nextAttrValue;
				return;
			}
			if (nextAttrValue === false || isNullOrUndefined(nextAttrValue)) {
				dom.removeAttribute(attrName);
			} else {
				if (attrName[5] === ':' && attrName.indexOf('xlink:') !== -1) {
					dom.setAttributeNS('http://www.w3.org/1999/xlink', attrName, nextAttrValue === true ? attrName : nextAttrValue);
				} else if (attrName[4] === ':' && attrName.indexOf('xml:') !== -1) {
					dom.setAttributeNS('http://www.w3.org/XML/1998/namespace', attrName, nextAttrValue === true ? attrName : nextAttrValue);
				} else {
					dom.setAttribute(attrName, nextAttrValue === true ? attrName : nextAttrValue);
				}
			}
		}
	}

	function patchComponent(lastNode, Component, instance, lastProps, nextProps, nextHooks, nextChildren, parentDom, lifecycle, context) {
		nextProps = addChildrenToProps(nextChildren, nextProps);

		if (isStatefulComponent(Component)) {
			var prevProps = instance.props;
			var prevState = instance.state;
			var nextState = instance.state;

			var childContext = instance.getChildContext();
			if (!isNullOrUndefined(childContext)) {
				context = babelHelpers.extends({}, context, childContext);
			}
			instance.context = context;
			var nextNode = instance._updateComponent(prevState, nextState, prevProps, nextProps);

			if (!isNullOrUndefined(nextNode)) {
				diffNodes(lastNode, nextNode, parentDom, null, lifecycle, context, instance, true);
				lastNode.dom = nextNode.dom;
				instance._lastNode = nextNode;
			}
		} else {
			var shouldUpdate = true;
			var nextHooksDefined = !isNullOrUndefined(nextHooks);

			if (nextHooksDefined && !isNullOrUndefined(nextHooks.componentShouldUpdate)) {
				shouldUpdate = nextHooks.componentShouldUpdate(lastNode.dom, lastProps, nextProps);
			}
			if (shouldUpdate !== false) {
				if (nextHooksDefined && !isNullOrUndefined(nextHooks.componentWillUpdate)) {
					nextHooks.componentWillUpdate(lastNode.dom, lastProps, nextProps);
				}
				var _nextNode = Component(nextProps);
				var dom = lastNode.dom;
				_nextNode.dom = dom;

				diffNodes(instance, _nextNode, dom, null, lifecycle, context, null, true);
				lastNode.instance = _nextNode;
				if (nextHooksDefined && !isNullOrUndefined(nextHooks.componentDidUpdate)) {
					nextHooks.componentDidUpdate(lastNode.dom, lastProps, nextProps);
				}
			}
		}
	}

	function patchNonKeyedChildren(lastChildren, nextChildren, dom, domChildren, namespace, lifecycle, context, instance, domChildrenIndex) {
		var isNotVirtualFragment = dom.append === undefined;
		var lastChildrenLength = lastChildren.length;
		var nextChildrenLength = nextChildren.length;
		var sameLength = lastChildrenLength === nextChildrenLength;

		if (sameLength === false) {
			if (lastChildrenLength > nextChildrenLength) {
				while (lastChildrenLength !== nextChildrenLength) {
					var lastChild = lastChildren[lastChildrenLength - 1];

					if (!isInvalidNode(lastChild)) {
						dom.removeChild(domChildren[lastChildrenLength - 1 + domChildrenIndex]);
						detachNode(lastChild);
					}
					lastChildrenLength--;
				}
			} else {
				while (lastChildrenLength !== nextChildrenLength) {
					var nextChild = nextChildren[lastChildrenLength];
					var domNode = void 0;

					if (isStringOrNumber(nextChild)) {
						domNode = document.createTextNode(nextChild);
					} else {
						domNode = mountNode(nextChild, null, namespace, lifecycle, context, instance);
					}

					insertOrAppendNonKeyed(dom, domNode);
					if (isNotVirtualFragment) {
						if (lastChildrenLength === 1) {
							domChildren.push(dom.firstChild);
						}
						isNotVirtualFragment && domChildren.splice(lastChildrenLength + domChildrenIndex, 0, domNode);
					}
					lastChildrenLength++;
				}
			}
		}
		for (var i = 0; i < nextChildrenLength; i++) {
			var _lastChild = lastChildren[i];
			var _nextChild = nextChildren[i];
			var index = i + domChildrenIndex;

			if (_lastChild !== _nextChild) {
				if (isInvalidNode(_nextChild)) {
					if (!isInvalidNode(_lastChild)) {
						var childNode = domChildren[index];

						if (!isNullOrUndefined(childNode)) {
							if (isStringOrNumber(_lastChild)) {
								childNode.nodeValue = '';
							} else if (sameLength === true) {
								var textNode = createEmptyTextNode();

								if (isArray(_lastChild) && _lastChild.length === 0) {
									insertOrAppendNonKeyed(dom, textNode);
									isNotVirtualFragment && domChildren.splice(index, 0, textNode);
								} else {
									dom.replaceChild(textNode, domChildren[index]);
									isNotVirtualFragment && domChildren.splice(index, 1, textNode);
									detachNode(_lastChild);
								}
							}
						}
					}
				} else {
					if (isInvalidNode(_lastChild)) {
						if (isStringOrNumber(_nextChild)) {
							var _textNode = document.createTextNode(_nextChild);
							dom.replaceChild(_textNode, domChildren[index]);
							isNotVirtualFragment && domChildren.splice(index, 1, _textNode);
						} else if (sameLength === true) {
							var _domNode = mountNode(_nextChild, null, namespace, lifecycle, context, instance);
							dom.replaceChild(_domNode, domChildren[index]);
							isNotVirtualFragment && domChildren.splice(index, 1, _domNode);
						}
					} else if (isStringOrNumber(_nextChild)) {
						if (lastChildrenLength === 1) {
							if (isStringOrNumber(_lastChild)) {
								if (dom.getElementsByTagName !== undefined) {
									dom.firstChild.nodeValue = _nextChild;
								} else {
									dom.nodeValue = _nextChild;
								}
							} else {
								detachNode(_lastChild);
								dom.textContent = _nextChild;
							}
						} else {
							var _textNode2 = document.createTextNode(_nextChild);
							var child = domChildren[index];

							if (isNullOrUndefined(child)) {
								dom.nodeValue = _textNode2.nodeValue;
							} else {
								// Next is single string so remove all children
								if (child.append === undefined) {
									isNotVirtualFragment && domChildren.splice(index, 1, _textNode2);
									dom.replaceChild(_textNode2, child);
								} else {
									// If previous child is virtual fragment remove all its content and replace with textNode
									dom.insertBefore(_textNode2, child.firstChild);
									child.remove();
									domChildren.splice(0, domChildren.length, _textNode2);
								}
							}
							detachNode(_lastChild);
						}
					} else if (isArray(_nextChild)) {
						if (isKeyed(_lastChild, _nextChild)) {
							patchKeyedChildren(_lastChild, _nextChild, domChildren[index], namespace, lifecycle, context, instance);
						} else {
							if (isArray(_lastChild)) {
								var domChild = domChildren[index];

								if (domChild.append === undefined) {
									if (_nextChild.length > 1 && _lastChild.length === 1) {
										var virtualFragment = createVirtualFragment();

										virtualFragment.insert(dom, domChild);
										virtualFragment.appendChild(domChild);
										isNotVirtualFragment && domChildren.splice(index, 1, virtualFragment);
										patchNonKeyedChildren(_lastChild, _nextChild, virtualFragment, virtualFragment.childNodes, namespace, lifecycle, context, instance, 0);
									} else {
										patchNonKeyedChildren(_lastChild, _nextChild, dom, domChildren, namespace, lifecycle, context, instance, 0);
									}
								} else {
									patchNonKeyedChildren(_lastChild, _nextChild, domChildren[index], domChildren[index].childNodes, namespace, lifecycle, context, instance, 0);
								}
							} else {
								if (_nextChild.length > 1) {
									var _virtualFragment = createVirtualFragment();
									_virtualFragment.appendChild(dom.firstChild);
									insertOrAppendNonKeyed(dom, _virtualFragment, dom.firstChild);
									isNotVirtualFragment && domChildren.splice(index, 1, _virtualFragment);
									patchNonKeyedChildren([_lastChild], _nextChild, _virtualFragment, _virtualFragment.childNodes, namespace, lifecycle, context, instance, i);
								} else {
									patchNonKeyedChildren([_lastChild], _nextChild, dom, domChildren, namespace, lifecycle, context, instance, i);
								}
							}
						}
					} else {
						if (isArray(_lastChild)) {
							patchNonKeyedChildren(_lastChild, [_nextChild], domChildren, domChildren[index].childNodes, namespace, lifecycle, context, instance, 0);
						} else {
							patchNode(_lastChild, _nextChild, dom, namespace, lifecycle, context, instance, null);
						}
					}
				}
			}
		}
	}

	function patchKeyedChildren(lastChildren, nextChildren, dom, namespace, lifecycle, context, instance) {
		var nextChildrenLength = nextChildren.length;
		var lastChildrenLength = lastChildren.length;
		if (nextChildrenLength === 0 && lastChildrenLength >= 5) {
			if (recyclingEnabled) {
				for (var i = 0; i < lastChildrenLength; i++) {
					pool(lastChildren[i]);
				}
			}
			// TODO can we improve the removal all nodes vs textContent = ''?
			dom.textContent = '';
			return;
		}
		var oldItem = void 0;
		var stop = false;
		var startIndex = 0;
		var oldStartIndex = 0;
		var endIndex = nextChildrenLength - 1;
		var oldEndIndex = lastChildrenLength - 1;
		var oldStartItem = lastChildrenLength > 0 ? lastChildren[oldStartIndex] : null;
		var startItem = nextChildrenLength > 0 ? nextChildren[startIndex] : null;
		var endItem = void 0;
		var oldEndItem = void 0;
		var nextNode = void 0;

		// TODO don't read key too often
		outer: while (!stop && startIndex <= endIndex && oldStartIndex <= oldEndIndex) {
			stop = true;
			while (startItem.key === oldStartItem.key) {
				patchNode(oldStartItem, startItem, dom, namespace, lifecycle, context, instance, true);
				startIndex++;
				oldStartIndex++;
				if (startIndex > endIndex || oldStartIndex > oldEndIndex) {
					break outer;
				} else {
					startItem = nextChildren[startIndex];
					oldStartItem = lastChildren[oldStartIndex];
					stop = false;
				}
			}
			endItem = nextChildren[endIndex];
			oldEndItem = lastChildren[oldEndIndex];
			while (endItem.key === oldEndItem.key) {
				patchNode(oldEndItem, endItem, dom, namespace, lifecycle, context, instance, true);
				endIndex--;
				oldEndIndex--;
				if (startIndex > endIndex || oldStartIndex > oldEndIndex) {
					break outer;
				} else {
					endItem = nextChildren[endIndex];
					oldEndItem = lastChildren[oldEndIndex];
					stop = false;
				}
			}
			while (endItem.key === oldStartItem.key) {
				nextNode = endIndex + 1 < nextChildrenLength ? nextChildren[endIndex + 1].dom : null;
				patchNode(oldStartItem, endItem, dom, namespace, lifecycle, context, instance, true);
				insertOrAppendKeyed(dom, endItem.dom, nextNode);
				endIndex--;
				oldStartIndex++;
				if (startIndex > endIndex || oldStartIndex > oldEndIndex) {
					break outer;
				} else {
					endItem = nextChildren[endIndex];
					oldStartItem = lastChildren[oldStartIndex];
					stop = false;
				}
			}
			while (startItem.key === oldEndItem.key) {
				nextNode = lastChildren[oldStartIndex].dom;
				patchNode(oldEndItem, startItem, dom, namespace, lifecycle, context, instance, true);
				insertOrAppendKeyed(dom, startItem.dom, nextNode);
				startIndex++;
				oldEndIndex--;
				if (startIndex > endIndex || oldStartIndex > oldEndIndex) {
					break outer;
				} else {
					startItem = nextChildren[startIndex];
					oldEndItem = lastChildren[oldEndIndex];
					stop = false;
				}
			}
		}

		if (oldStartIndex > oldEndIndex) {
			if (startIndex <= endIndex) {
				nextNode = endIndex + 1 < nextChildrenLength ? nextChildren[endIndex + 1].dom : null;
				for (; startIndex <= endIndex; startIndex++) {
					insertOrAppendKeyed(dom, mountNode(nextChildren[startIndex], null, namespace, lifecycle, context, instance), nextNode);
				}
			}
		} else if (startIndex > endIndex) {
			for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
				oldItem = lastChildren[oldStartIndex];
				remove(oldItem, dom);
			}
		} else {
			var oldItemsMap = new Map();

			for (var _i4 = oldStartIndex; _i4 <= oldEndIndex; _i4++) {
				oldItem = lastChildren[_i4];
				oldItemsMap.set(oldItem.key, oldItem);
			}
			nextNode = endIndex + 1 < nextChildrenLength ? nextChildren[endIndex + 1] : null;

			for (var _i5 = endIndex; _i5 >= startIndex; _i5--) {
				var item = nextChildren[_i5];
				var key = item.key;
				oldItem = oldItemsMap.get(key);
				nextNode = isNullOrUndefined(nextNode) ? undefined : nextNode.dom; // Default to undefined instead null, because nextSibling in DOM is null
				if (oldItem === undefined) {
					insertOrAppendKeyed(dom, mountNode(item, null, namespace, lifecycle, context, instance), nextNode);
				} else {
					oldItemsMap.delete(key);
					patchNode(oldItem, item, dom, namespace, lifecycle, context, instance, true);

					if (item.dom.nextSibling !== nextNode) {
						insertOrAppendKeyed(dom, item.dom, nextNode);
					}
				}
				nextNode = item;
			}
			for (var _i6 = oldStartIndex; _i6 <= oldEndIndex; _i6++) {
				oldItem = lastChildren[_i6];
				if (oldItemsMap.has(oldItem.key)) {
					remove(oldItem, dom);
				}
			}
		}
	}

	var recyclingEnabled = false;

	function recycle(node, tpl, lifecycle, context, instance) {
		if (tpl !== undefined) {
			var key = node.key;
			var _pool = key === null ? tpl.pools.nonKeyed : tpl.pools.keyed[key];
			if (!isNullOrUndefined(_pool)) {
				var recycledNode = _pool.pop();
				if (!isNullOrUndefined(recycledNode)) {
					patchNode(recycledNode, node, null, null, lifecycle, context, instance, true);
					return node.dom;
				}
			}
		}
		return null;
	}

	function pool(node) {
		var tpl = node.tpl;

		if (!isNullOrUndefined(tpl)) {
			var key = node.key;
			var pools = tpl.pools;

			if (key === null) {
				var _pool2 = pools.nonKeyed;
				_pool2 && _pool2.push(node);
			} else {
				var _pool3 = pools.keyed;
				(_pool3[key] || (_pool3[key] = [])).push(node);
			}
			return true;
		}
		return false;
	}

	var MathNamespace = 'http://www.w3.org/1998/Math/MathML';
	var SVGNamespace = 'http://www.w3.org/2000/svg';

	function isVirtualFragment(obj) {
		return !isNullOrUndefined(obj.append);
	}

	function insertOrAppendNonKeyed(parentDom, newNode, nextNode) {
		if (isNullOrUndefined(nextNode)) {
			if (isVirtualFragment(newNode)) {
				newNode.append(parentDom);
			} else {
				parentDom.appendChild(newNode);
			}
		} else {
			if (isVirtualFragment(newNode)) {
				newNode.insert(parentDom, nextNode);
			} else if (isVirtualFragment(nextNode)) {
				parentDom.insertBefore(newNode, nextNode.childNodes[0]);
			} else {
				parentDom.insertBefore(newNode, nextNode);
			}
		}
	}

	function insertOrAppendKeyed(parentDom, newNode, nextNode) {
		if (isNullOrUndefined(nextNode)) {
			parentDom.appendChild(newNode);
		} else {
			parentDom.insertBefore(newNode, nextNode);
		}
	}

	function createElement(tag, namespace) {
		if (isNullOrUndefined(namespace)) {
			return document.createElement(tag);
		} else {
			return document.createElementNS(namespace, tag);
		}
	}

	function appendText(text, parentDom, singleChild) {
		if (parentDom) {
			if (singleChild) {
				if (text !== '') {
					parentDom.textContent = text;
				} else {
					var textNode = document.createTextNode('');

					parentDom.appendChild(textNode);
					return textNode;
				}
			} else {
				var _textNode = document.createTextNode(text);

				parentDom.appendChild(_textNode);
				return _textNode;
			}
		} else {
			return document.createTextNode(text);
		}
	}

	function replaceNode(lastNode, nextNode, parentDom, namespace, lifecycle, context, instance) {
		var lastInstance = null;
		var instanceLastNode = lastNode._lastNode;

		if (!isNullOrUndefined(instanceLastNode)) {
			lastInstance = lastNode;
			lastNode = instanceLastNode;
		}
		var dom = mountNode(nextNode, null, namespace, lifecycle, context, instance);

		nextNode.dom = dom;
		parentDom.replaceChild(dom, lastNode.dom);
		if (lastInstance !== null) {
			lastInstance._lastNode = nextNode;
		}
		detachNode(lastNode);
	}

	function detachNode(node) {
		if (isInvalidNode(node) || isStringOrNumber(node)) {
			return;
		}
		var instance = node.instance;

		var instanceHooks = null;
		var instanceChildren = null;
		if (!isNullOrUndefined(instance)) {
			instanceHooks = instance.hooks;
			instanceChildren = instance.children;

			if (instance.render !== undefined) {
				instance.componentWillUnmount();
				instance._unmounted = true;
			}
		}
		var hooks = node.hooks || instanceHooks;
		if (!isNullOrUndefined(hooks)) {
			if (!isNullOrUndefined(hooks.willDetach)) {
				hooks.willDetach(node.dom);
			}
			if (!isNullOrUndefined(hooks.componentWillUnmount)) {
				hooks.componentWillUnmount(node.dom, hooks);
			}
		}
		var children = node.children || instanceChildren;
		if (!isNullOrUndefined(children)) {
			if (isArray(children)) {
				for (var i = 0; i < children.length; i++) {
					detachNode(children[i]);
				}
			} else {
				detachNode(children);
			}
		}
	}

	function createEmptyTextNode() {
		return document.createTextNode('');
	}

	function remove(node, parentDom) {
		var dom = node.dom;
		if (dom === parentDom) {
			dom.innerHTML = '';
		} else {
			parentDom.removeChild(dom);
			if (recyclingEnabled) {
				pool(node);
			}
		}
		detachNode(node);
	}

	function removeEvents(lastEvents, dom) {
		for (var event in lastEvents) {
			dom[event] = null;
		}
	}

	function insertChildren(parentNode, childNodes, dom) {
		// we need to append all childNodes now
		for (var i = 0; i < childNodes.length; i++) {
			parentNode.insertBefore(childNodes[i], dom);
		}
	}

	// TODO: for node we need to check if document is valid
	function getActiveNode() {
		return document.activeElement;
	}

	function resetActiveNode(activeNode) {
		if (activeNode !== document.body && document.activeElement !== activeNode) {
			activeNode.focus(); // TODO: verify are we doing new focus event, if user has focus listener this might trigger it
		}
	}

	function createVirtualFragment() {
		var childNodes = [];
		var dom = document.createTextNode('');
		var parentNode = null;

		var fragment = {
			childNodes: childNodes,
			appendChild: function appendChild(domNode) {
				// TODO we need to check if the domNode already has a parentNode of VirtualFragment so we can remove it
				childNodes.push(domNode);
				if (parentNode) {
					parentNode.insertBefore(domNode, dom);
				}
			},
			removeChild: function removeChild(domNode) {
				if (parentNode) {
					parentNode.removeChild(domNode);
				}
				childNodes.splice(childNodes.indexOf(domNode), 1);
			},
			insertBefore: function insertBefore(domNode, refNode) {
				if (parentNode) {
					parentNode.insertBefore(domNode, refNode);
				}
				childNodes.splice(childNodes.indexOf(refNode), 0, domNode);
			},
			replaceChild: function replaceChild(domNode, refNode) {
				parentNode.replaceChild(domNode, refNode);
				replaceInArray(childNodes, refNode, domNode);
			},
			append: function append(parentDom) {
				parentDom.appendChild(dom);
				parentNode = parentDom;
				insertChildren(parentNode, childNodes, dom);
			},
			insert: function insert(parentDom, refNode) {
				parentDom.insertBefore(dom, refNode);
				parentNode = parentDom;
				insertChildren(parentNode, childNodes, dom);
			},
			remove: function remove() {
				parentNode.removeChild(dom);
				for (var i = 0; i < childNodes.length; i++) {
					parentNode.removeChild(childNodes[i]);
				}
				parentNode = null;
			},

			// here to emulate not being a TextNode
			getElementsByTagName: null
		};

		Object.defineProperty(fragment, 'parentNode', {
			get: function get() {
				return parentNode;
			}
		});
		Object.defineProperty(fragment, 'firstChild', {
			get: function get() {
				return childNodes[0];
			}
		});

		return fragment;
	}

	function isKeyed(lastChildren, nextChildren) {
		return nextChildren.length && !isNullOrUndefined(nextChildren[0]) && !isNullOrUndefined(nextChildren[0].key) || lastChildren.length && !isNullOrUndefined(lastChildren[0]) && !isNullOrUndefined(lastChildren[0].key);
	}

	function selectOptionValueIfNeeded(vdom, values) {
		if (vdom.tag !== 'option') {
			for (var i = 0, len = vdom.children.length; i < len; i++) {
				selectOptionValueIfNeeded(vdom.children[i], values);
			}
			// NOTE! Has to be a return here to catch optGroup elements
			return;
		}

		var value = vdom.attrs && vdom.attrs.value;

		if (values[value]) {
			vdom.attrs = vdom.attrs || {};
			vdom.attrs.selected = 'selected';
		}
	}

	function selectValue(vdom) {
		if (vdom.tag !== 'select') {
			return;
		}
		var value = vdom.attrs && vdom.attrs.value;

		if (isNullOrUndefined(value)) {
			return;
		}

		var values = {};
		if (!isArray(value)) {
			values[value] = value;
		} else {
			for (var i = 0, len = value.length; i < len; i++) {
				values[value[i]] = value[i];
			}
		}
		selectOptionValueIfNeeded(vdom, values);

		if (vdom.attrs && vdom.attrs[value]) {
			delete vdom.attrs.value; // TODO! Avoid deletion here. Set to null or undef. Not sure what you want to usev
		}
	}

	function placeholder(node, parentDom) {
		var dom = createEmptyTextNode();

		if (parentDom !== null) {
			parentDom.appendChild(dom);
		}
		if (!isInvalidNode(node)) {
			node.dom = dom;
		}
		return dom;
	}

	function handleAttachedHooks(hooks, lifecycle, dom) {
		if (!isNullOrUndefined(hooks.created)) {
			hooks.created(dom);
		}
		if (!isNullOrUndefined(hooks.attached)) {
			lifecycle.addListener(function () {
				hooks.attached(dom);
			});
		}
	}

	function queueStateChanges(component, newState, callback) {
		for (var stateKey in newState) {
			component._pendingState[stateKey] = newState[stateKey];
		}
		if (component._pendingSetState === false) {
			component._pendingSetState = true;
			applyState(component, false, callback);
		}
	}

	function applyState(component, force, callback) {
		var blockRender = component._blockRender;

		if (component._deferSetState === false || force) {
			component._pendingSetState = false;
			var pendingState = component._pendingState;
			var oldState = component.state;
			var nextState = babelHelpers.extends({}, oldState, pendingState);

			component._pendingState = {};
			var nextNode = component._updateComponent(oldState, nextState, component.props, component.props, force);

			if (!blockRender) {
				(function () {
					var lastNode = component._lastNode;
					var parentDom = lastNode.dom.parentNode;

					var activeNode = getActiveNode();
					var subLifecycle = new Lifecycle();
					component._diffNodes(lastNode, nextNode, parentDom, null, subLifecycle, component.context, false, component.instance);
					component._lastNode = nextNode;
					subLifecycle.addListener(function () {
						subLifecycle.trigger();
						callback && callback();
					});
					resetActiveNode(activeNode);
				})();
			}
		}
	}

	var Component = function () {
		function Component(props) {
			babelHelpers.classCallCheck(this, Component);

			/** @type {object} */
			this.props = props || {};

			/** @type {object} */
			this.state = {};

			/** @type {object} */
			this.refs = {};
			this._blockRender = false;
			this._blockSetState = false;
			this._deferSetState = false;
			this._pendingSetState = false;
			this._pendingState = {};
			this._lastNode = null;
			this._unmounted = false;
			this.context = {};
			this._diffNodes = null;
		}

		babelHelpers.createClass(Component, [{
			key: 'render',
			value: function render() {}
		}, {
			key: 'forceUpdate',
			value: function forceUpdate(callback) {
				applyState(this, true, callback);
			}
		}, {
			key: 'setState',
			value: function setState(newState, callback) {
				if (this._blockSetState === false) {
					queueStateChanges(this, newState, callback);
				} else {
					throw Error('Inferno Error: Cannot update state via setState() in componentWillUpdate()');
				}
			}
		}, {
			key: 'componentDidMount',
			value: function componentDidMount() {}
		}, {
			key: 'componentWillMount',
			value: function componentWillMount() {}
		}, {
			key: 'componentWillUnmount',
			value: function componentWillUnmount() {}
		}, {
			key: 'componentDidUpdate',
			value: function componentDidUpdate() {}
		}, {
			key: 'shouldComponentUpdate',
			value: function shouldComponentUpdate() {
				return true;
			}
		}, {
			key: 'componentWillReceiveProps',
			value: function componentWillReceiveProps() {}
		}, {
			key: 'componentWillUpdate',
			value: function componentWillUpdate() {}
		}, {
			key: 'getChildContext',
			value: function getChildContext() {}
		}, {
			key: '_updateComponent',
			value: function _updateComponent(prevState, nextState, prevProps, nextProps, force) {
				if (this._unmounted === true) {
					this._unmounted = false;
					return false;
				}
				if (!isNullOrUndefined(nextProps) && isNullOrUndefined(nextProps.children)) {
					nextProps.children = prevProps.children;
				}
				if (prevProps !== nextProps || prevState !== nextState || force) {
					if (prevProps !== nextProps) {
						this._blockRender = true;
						this.componentWillReceiveProps(nextProps);
						this._blockRender = false;
					}
					var shouldUpdate = this.shouldComponentUpdate(nextProps, nextState);

					if (shouldUpdate !== false) {
						this._blockSetState = true;
						this.componentWillUpdate(nextProps, nextState);
						this._blockSetState = false;
						this.props = nextProps;
						this.state = nextState;
						var node = this.render();

						this.componentDidUpdate(prevProps, prevState);
						return node;
					}
				}
			}
		}]);
		return Component;
	}();

	function addChildrenToProps(children, props) {
		if (!isNullOrUndefined(children)) {
			var isChildrenArray = isArray(children);
			if (isChildrenArray && children.length > 0 || !isChildrenArray) {
				if (props) {
					props.children = children;
				} else {
					props = {
						children: children
					};
				}
			}
		}
		return props;
	}

	function isArray(obj) {
		return obj instanceof Array;
	}

	function isStatefulComponent(obj) {
		return Component.isPrototypeOf(obj);
	}

	function isStringOrNumber(obj) {
		return typeof obj === 'string' || typeof obj === 'number';
	}

	function isNullOrUndefined(obj) {
		return obj === undefined || obj === null;
	}

	function isInvalidNode(obj) {
		return obj === undefined || obj === null || obj === false;
	}

	function isFunction(obj) {
		return typeof obj === 'function';
	}

	function isAttrAnEvent(attr) {
		return attr[0] === 'o' && attr[1] === 'n' && attr.length > 3;
	}

	function isString(obj) {
		return typeof obj === 'string';
	}

	function isPromise(obj) {
		return obj instanceof Promise;
	}

	function replaceInArray(array, obj, newObj) {
		array.splice(array.indexOf(obj), 1, newObj);
	}

	/*
	export function removeInArray(array, obj) {
		array.splice(array.indexOf(obj), 1);
	}
	*/

	function mountNode(node, parentDom, namespace, lifecycle, context, instance) {
		if (isInvalidNode(node) || isArray(node)) {
			return placeholder(node, parentDom);
		}

		var tpl = node.tpl;

		if (recyclingEnabled) {
			var dom = recycle(node, tpl, lifecycle, context, instance);

			if (dom !== null) {
				if (parentDom !== null) {
					parentDom.appendChild(dom);
				}
				return dom;
			}
		}

		if (tpl === undefined) {
			return appendNode(node, parentDom, namespace, lifecycle, context, instance);
		} else {
			return appendNodeWithTemplate(node, tpl, parentDom, namespace, lifecycle, context, instance);
		}
	}

	function appendNodeWithTemplate(node, tpl, parentDom, namespace, lifecycle, context, instance) {
		var tag = node.tag;

		if (tpl.isComponent === true) {
			return mountComponent(node, tag, node.attrs || {}, node.hooks, node.children, parentDom, lifecycle, context);
		}
		var dom = tpl.dom.cloneNode(false);

		node.dom = dom;
		if (tpl.hasHooks === true) {
			handleAttachedHooks(node.hooks, lifecycle, dom);
		}
		// tpl.childrenType:
		// 0: no children
		// 1: text node
		// 2: single child
		// 3: multiple children
		// 4: multiple children (keyed)
		// 5: variable children (defaults to no optimisation)

		switch (tpl.childrenType) {
			case 1:
				appendText(node.children, dom, true);
				break;
			case 2:
				mountNode(node.children, dom, namespace, lifecycle, context, instance);
				break;
			case 3:
				mountArrayChildren(node, node.children, dom, namespace, lifecycle, context, instance);
				break;
			case 4:
				mountArrayChildrenWithKeys(node.children, dom, namespace, lifecycle, context, instance);
				break;
			case 5:
				mountChildren(node, node.children, dom, namespace, lifecycle, context, instance);
				break;
			default:
				break;
		}

		if (tpl.hasAttrs === true) {
			mountAttributes(node, node.attrs, dom, instance);
		}
		if (tpl.hasClassName === true) {
			dom.className = node.className;
		}
		if (tpl.hasStyle === true) {
			patchStyle(null, node.style, dom);
		}
		if (tpl.hasEvents === true) {
			mountEvents(node.events, dom);
		}
		if (parentDom !== null) {
			parentDom.appendChild(dom);
		}
		return dom;
	}

	function appendNode(node, parentDom, namespace, lifecycle, context, instance) {
		var tag = node.tag;

		if (tag === null) {
			return placeholder(node, parentDom);
		}
		if (isFunction(tag)) {
			return mountComponent(node, tag, node.attrs || {}, node.hooks, node.children, parentDom, lifecycle, context);
		}
		namespace = namespace || tag === 'svg' ? SVGNamespace : tag === 'math' ? MathNamespace : null;
		if (!isString(tag) || tag === '') {
			throw Error('Inferno Error: Expected function or string for element tag type');
		}
		var dom = createElement(tag, namespace);
		var children = node.children;
		var attrs = node.attrs;
		var events = node.events;
		var hooks = node.hooks;
		var className = node.className;
		var style = node.style;

		node.dom = dom;
		if (!isNullOrUndefined(hooks)) {
			handleAttachedHooks(hooks, lifecycle, dom);
		}
		if (!isInvalidNode(children)) {
			mountChildren(node, children, dom, namespace, lifecycle, context, instance);
		}
		if (!isNullOrUndefined(attrs)) {
			mountAttributes(node, attrs, dom, instance);
		}
		if (!isNullOrUndefined(className)) {
			dom.className = className;
		}
		if (!isNullOrUndefined(style)) {
			patchStyle(null, style, dom);
		}
		if (!isNullOrUndefined(events)) {
			mountEvents(events, dom);
		}
		if (parentDom !== null) {
			parentDom.appendChild(dom);
		}
		return dom;
	}

	function appendPromise(child, parentDom, domChildren, namespace, lifecycle, context, instance) {
		var placeholder = createEmptyTextNode();
		domChildren && domChildren.push(placeholder);

		child.then(function (node) {
			// TODO check for text nodes and arrays
			var dom = mountNode(node, null, namespace, lifecycle, context, instance);

			parentDom.replaceChild(dom, placeholder);
			domChildren && replaceInArray(domChildren, placeholder, dom);
		});
		parentDom.appendChild(placeholder);
	}

	function mountArrayChildrenWithKeys(children, parentDom, namespace, lifecycle, context, instance) {
		for (var i = 0; i < children.length; i++) {
			mountNode(children[i], parentDom, namespace, lifecycle, context, instance);
		}
	}

	function mountArrayChildren(node, children, parentDom, namespace, lifecycle, context, instance) {
		var domChildren = null;
		var isNonKeyed = false;
		var hasKeyedAssumption = false;

		for (var i = 0; i < children.length; i++) {
			var child = children[i];

			if (isStringOrNumber(child)) {
				isNonKeyed = true;
				domChildren = domChildren || [];
				domChildren.push(appendText(child, parentDom, false));
			} else if (!isNullOrUndefined(child) && isArray(child)) {
				var virtualFragment = createVirtualFragment();

				isNonKeyed = true;
				mountArrayChildren(node, child, virtualFragment, namespace, lifecycle, context, instance);
				insertOrAppendNonKeyed(parentDom, virtualFragment);
				domChildren = domChildren || [];
				domChildren.push(virtualFragment);
			} else if (isPromise(child)) {
				appendPromise(child, parentDom, domChildren, namespace, lifecycle, context, instance);
			} else {
				var domNode = mountNode(child, parentDom, namespace, lifecycle, context, instance);

				if (isNonKeyed || !hasKeyedAssumption && child && isNullOrUndefined(child.key)) {
					isNonKeyed = true;
					domChildren = domChildren || [];
					domChildren.push(domNode);
				} else if (isInvalidNode(child)) {
					isNonKeyed = true;
					domChildren = domChildren || [];
					domChildren.push(domNode);
				} else if (hasKeyedAssumption === false) {
					hasKeyedAssumption = true;
				}
			}
		}
		if (domChildren !== null && domChildren.length > 1 && isNonKeyed === true) {
			node.domChildren = domChildren;
		}
	}

	function mountChildren(node, children, parentDom, namespace, lifecycle, context, instance) {
		if (isArray(children)) {
			mountArrayChildren(node, children, parentDom, namespace, lifecycle, context, instance);
		} else if (isStringOrNumber(children)) {
			appendText(children, parentDom, true);
		} else if (isPromise(children)) {
			appendPromise(children, parentDom, null, namespace, lifecycle, context, instance);
		} else {
			mountNode(children, parentDom, namespace, lifecycle, context, instance);
		}
	}

	function mountRef(instance, value, dom) {
		if (!isInvalidNode(instance) && isString(value)) {
			instance.refs[value] = dom;
		}
	}

	function mountEvents(events, dom) {
		var eventKeys = Object.keys(events);

		for (var i = 0; i < eventKeys.length; i++) {
			var event = eventKeys[i];

			dom[event] = events[event];
		}
	}

	function mountComponent(parentNode, Component, props, hooks, children, parentDom, lifecycle, context) {
		props = addChildrenToProps(children, props);

		var dom = void 0;
		if (isStatefulComponent(Component)) {
			var instance = new Component(props);
			instance._diffNodes = diffNodes;

			var childContext = instance.getChildContext();
			if (!isNullOrUndefined(childContext)) {
				context = babelHelpers.extends({}, context, childContext);
			}
			instance.context = context;

			// Block setting state - we should render only once, using latest state
			instance._pendingSetState = true;
			instance.componentWillMount();
			var shouldUpdate = instance.shouldComponentUpdate();
			if (shouldUpdate) {
				instance.componentWillUpdate();
				var pendingState = instance._pendingState;
				var oldState = instance.state;
				instance.state = babelHelpers.extends({}, oldState, pendingState);
			}
			var _node = instance.render();
			instance._pendingSetState = false;

			if (!isNullOrUndefined(_node)) {
				dom = mountNode(_node, null, null, lifecycle, context, instance);
				instance._lastNode = _node;
				if (parentDom !== null) {
					// avoid DEOPT
					parentDom.appendChild(dom);
				}
				instance.componentDidMount();
				instance.componentDidUpdate();
			}

			parentNode.dom = dom;
			parentNode.instance = instance;
			return dom;
		}
		if (!isNullOrUndefined(hooks)) {
			if (!isNullOrUndefined(hooks.componentWillMount)) {
				hooks.componentWillMount(null, props);
			}
			if (!isNullOrUndefined(hooks.componentDidMount)) {
				lifecycle.addListener(function () {
					hooks.componentDidMount(dom, props);
				});
			}
		}

		/* eslint new-cap: 0 */
		var node = Component(props);
		dom = mountNode(node, null, null, lifecycle, context, null);

		parentNode.instance = node;

		if (parentDom !== null) {
			parentDom.appendChild(dom);
		}
		parentNode.dom = dom;
		return dom;
	}

	function mountAttributes(node, attrs, dom, instance) {
		if (node.tag === 'select') {
			selectValue(node);
		}
		var attrsKeys = Object.keys(attrs);

		for (var i = 0; i < attrsKeys.length; i++) {
			var attr = attrsKeys[i];

			if (attr === 'ref') {
				mountRef(instance, attrs[attr], dom);
			} else {
				patchAttribute(attr, attrs[attr], dom);
			}
		}
	}

	var roots = [];

	function getRoot(parentDom) {
		for (var i = 0; i < roots.length; i++) {
			var root = roots[i];

			if (root.dom === parentDom) {
				return root;
			}
		}
		return null;
	}

	function removeRoot(rootNode) {
		for (var i = 0; i < roots.length; i++) {
			var root = roots[i];

			if (root === rootNode) {
				roots.splice(i, 1);
				return;
			}
		}
	}

	function render(node, parentDom) {
		var root = getRoot(parentDom);
		var lifecycle = new Lifecycle();

		if (root === null) {
			mountNode(node, parentDom, null, lifecycle, {}, null);
			lifecycle.trigger();
			roots.push({ node: node, dom: parentDom });
		} else {
			var activeNode = getActiveNode();

			patchNode(root.node, node, parentDom, null, lifecycle, {}, null, null);
			lifecycle.trigger();
			if (node === null) {
				removeRoot(root);
			}
			root.node = node;
			resetActiveNode(activeNode);
		}
	}

	var index = {
		render: render
	};

	return index;

}));