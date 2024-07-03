
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	const identity = (x) => x;

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function not_equal(a, b) {
		return a != a ? b == b : a !== b;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @returns {void} */
	function validate_store(store, name) {
		if (store != null && typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function action_destroyer(action_result) {
		return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
	}

	/** @param {number | string} value
	 * @returns {[number, string]}
	 */
	function split_css_unit(value) {
		const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
		return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
	}

	const is_client = typeof window !== 'undefined';

	/** @type {() => number} */
	let now = is_client ? () => window.performance.now() : () => Date.now();

	let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;

	const tasks = new Set();

	/**
	 * @param {number} now
	 * @returns {void}
	 */
	function run_tasks(now) {
		tasks.forEach((task) => {
			if (!task.c(now)) {
				tasks.delete(task);
				task.f();
			}
		});
		if (tasks.size !== 0) raf(run_tasks);
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {import('./private.js').TaskCallback} callback
	 * @returns {import('./private.js').Task}
	 */
	function loop(callback) {
		/** @type {import('./private.js').TaskEntry} */
		let task;
		if (tasks.size === 0) raf(run_tasks);
		return {
			promise: new Promise((fulfill) => {
				tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {Node} node
	 * @returns {CSSStyleSheet}
	 */
	function append_empty_stylesheet(node) {
		const style_element = element('style');
		// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
		// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
		// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
		// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
		// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
		style_element.textContent = '/* empty */';
		append_stylesheet(get_root_for_style(node), style_element);
		return style_element.sheet;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	// we need to store the information for multiple documents because a Svelte application could also contain iframes
	// https://github.com/sveltejs/svelte/issues/3624
	/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
	const managed_styles = new Map();

	let active = 0;

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	/**
	 * @param {string} str
	 * @returns {number}
	 */
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {Element & ElementCSSInlineStyle} node
	 * @returns {{ stylesheet: any; rules: {}; }}
	 */
	function create_style_information(doc, node) {
		const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
		managed_styles.set(doc, info);
		return info;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {number} a
	 * @param {number} b
	 * @param {number} duration
	 * @param {number} delay
	 * @param {(t: number) => number} ease
	 * @param {(t: number, u: number) => string} fn
	 * @param {number} uid
	 * @returns {string}
	 */
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		const doc = get_root_for_style(node);
		const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
		if (!rules[name]) {
			rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {string} [name]
	 * @returns {void}
	 */
	function delete_rule(node, name) {
		const previous = (node.style.animation || '').split(', ');
		const next = previous.filter(
			name
				? (anim) => anim.indexOf(name) < 0 // remove specific animation
				: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
		);
		const deleted = previous.length - next.length;
		if (deleted) {
			node.style.animation = next.join(', ');
			active -= deleted;
			if (!active) clear_rules();
		}
	}

	/** @returns {void} */
	function clear_rules() {
		raf(() => {
			if (active) return;
			managed_styles.forEach((info) => {
				const { ownerNode } = info.stylesheet;
				// there is no ownerNode if it runs on jsdom.
				if (ownerNode) detach(ownerNode);
			});
			managed_styles.clear();
		});
	}

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	/**
	 * @type {Promise<void> | null}
	 */
	let promise;

	/**
	 * @returns {Promise<void>}
	 */
	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	/**
	 * @param {Element} node
	 * @param {INTRO | OUTRO | boolean} direction
	 * @param {'start' | 'end'} kind
	 * @returns {void}
	 */
	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/**
	 * @type {import('../transition/public.js').TransitionConfig}
	 */
	const null_transition = { duration: 0 };

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @returns {{ start(): void; invalidate(): void; end(): void; }}
	 */
	function create_in_transition(node, fn, params) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'in' };
		let config = fn(node, params, options);
		let running = false;
		let animation_name;
		let task;
		let uid = 0;

		/**
		 * @returns {void} */
		function cleanup() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @returns {void} */
		function go() {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;
			if (css) animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
			tick(0, 1);
			const start_time = now() + delay;
			const end_time = start_time + duration;
			if (task) task.abort();
			running = true;
			add_render_callback(() => dispatch(node, true, 'start'));
			task = loop((now) => {
				if (running) {
					if (now >= end_time) {
						tick(1, 0);
						dispatch(node, true, 'end');
						cleanup();
						return (running = false);
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(t, 1 - t);
					}
				}
				return running;
			});
		}
		let started = false;
		return {
			start() {
				if (started) return;
				started = true;
				delete_rule(node);
				if (is_function(config)) {
					config = config(options);
					wait().then(go);
				} else {
					go();
				}
			},
			invalidate() {
				started = false;
			},
			end() {
				if (running) {
					cleanup();
					running = false;
				}
			}
		};
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @returns {{ end(reset: any): void; }}
	 */
	function create_out_transition(node, fn, params) {
		/** @type {TransitionOptions} */
		const options = { direction: 'out' };
		let config = fn(node, params, options);
		let running = true;
		let animation_name;
		const group = outros;
		group.r += 1;
		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function go() {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;

			if (css) animation_name = create_rule(node, 1, 0, duration, delay, easing, css);

			const start_time = now() + delay;
			const end_time = start_time + duration;
			add_render_callback(() => dispatch(node, false, 'start'));

			if ('inert' in node) {
				original_inert_value = /** @type {HTMLElement} */ (node).inert;
				node.inert = true;
			}

			loop((now) => {
				if (running) {
					if (now >= end_time) {
						tick(0, 1);
						dispatch(node, false, 'end');
						if (!--group.r) {
							// this will result in `end()` being called,
							// so we don't need to clean up here
							run_all(group.c);
						}
						return false;
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(1 - t, t);
					}
				}
				return running;
			});
		}

		if (is_function(config)) {
			wait().then(() => {
				// @ts-ignore
				config = config(options);
				go();
			});
		} else {
			go();
		}

		return {
			end(reset) {
				if (reset && 'inert' in node) {
					node.inert = original_inert_value;
				}
				if (reset && config.tick) {
					config.tick(1, 0);
				}
				if (running) {
					if (animation_name) delete_rule(node, animation_name);
					running = false;
				}
			}
		};
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.8';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	function styleInject(css, ref) {
	  if ( ref === void 0 ) ref = {};
	  var insertAt = ref.insertAt;

	  if (!css || typeof document === 'undefined') { return; }

	  var head = document.head || document.getElementsByTagName('head')[0];
	  var style = document.createElement('style');
	  style.type = 'text/css';

	  if (insertAt === 'top') {
	    if (head.firstChild) {
	      head.insertBefore(style, head.firstChild);
	    } else {
	      head.appendChild(style);
	    }
	  } else {
	    head.appendChild(style);
	  }

	  if (style.styleSheet) {
	    style.styleSheet.cssText = css;
	  } else {
	    style.appendChild(document.createTextNode(css));
	  }
	}

	var css_248z$7 = "@charset \"UTF-8\";\n@import url(\"https://fonts.googleapis.com/css?family=Nunito:400,700\");\n/*! bulma.io v0.9.4 | MIT License | github.com/jgthms/bulma */\n/* Bulma Utilities */\n.pagination-previous,\n.pagination-next,\n.pagination-link,\n.pagination-ellipsis, .file-cta,\n.file-name, .select select, .textarea, .input, .button {\n  -moz-appearance: none;\n  -webkit-appearance: none;\n  align-items: center;\n  border: 2px solid transparent;\n  border-radius: 4px;\n  box-shadow: none;\n  display: inline-flex;\n  font-size: 1rem;\n  height: 2.5em;\n  justify-content: flex-start;\n  line-height: 1.5;\n  padding-bottom: calc(0.5em - 2px);\n  padding-left: calc(0.75em - 2px);\n  padding-right: calc(0.75em - 2px);\n  padding-top: calc(0.5em - 2px);\n  position: relative;\n  vertical-align: top;\n}\n.pagination-previous:focus,\n.pagination-next:focus,\n.pagination-link:focus,\n.pagination-ellipsis:focus, .file-cta:focus,\n.file-name:focus, .select select:focus, .textarea:focus, .input:focus, .button:focus, .is-focused.pagination-previous,\n.is-focused.pagination-next,\n.is-focused.pagination-link,\n.is-focused.pagination-ellipsis, .is-focused.file-cta,\n.is-focused.file-name, .select select.is-focused, .is-focused.textarea, .is-focused.input, .is-focused.button, .pagination-previous:active,\n.pagination-next:active,\n.pagination-link:active,\n.pagination-ellipsis:active, .file-cta:active,\n.file-name:active, .select select:active, .textarea:active, .input:active, .button:active, .is-active.pagination-previous,\n.is-active.pagination-next,\n.is-active.pagination-link,\n.is-active.pagination-ellipsis, .is-active.file-cta,\n.is-active.file-name, .select select.is-active, .is-active.textarea, .is-active.input, .is-active.button {\n  outline: none;\n}\n[disabled].pagination-previous,\n[disabled].pagination-next,\n[disabled].pagination-link,\n[disabled].pagination-ellipsis, [disabled].file-cta,\n[disabled].file-name, .select select[disabled], [disabled].textarea, [disabled].input, [disabled].button, fieldset[disabled] .pagination-previous,\nfieldset[disabled] .pagination-next,\nfieldset[disabled] .pagination-link,\nfieldset[disabled] .pagination-ellipsis, fieldset[disabled] .file-cta,\nfieldset[disabled] .file-name, fieldset[disabled] .select select, .select fieldset[disabled] select, fieldset[disabled] .textarea, fieldset[disabled] .input, fieldset[disabled] .button {\n  cursor: not-allowed;\n}\n\n.is-unselectable, .tabs, .pagination-previous,\n.pagination-next,\n.pagination-link,\n.pagination-ellipsis, .breadcrumb, .file, .button {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n\n.navbar-link:not(.is-arrowless)::after, .select:not(.is-multiple):not(.is-loading)::after {\n  border: 3px solid transparent;\n  border-radius: 2px;\n  border-right: 0;\n  border-top: 0;\n  content: \" \";\n  display: block;\n  height: 0.625em;\n  margin-top: -0.4375em;\n  pointer-events: none;\n  position: absolute;\n  top: 50%;\n  transform: rotate(-45deg);\n  transform-origin: center;\n  width: 0.625em;\n}\n\n.tabs:not(:last-child), .pagination:not(:last-child), .message:not(:last-child), .level:not(:last-child), .breadcrumb:not(:last-child), .block:not(:last-child), .title:not(:last-child),\n.subtitle:not(:last-child), .table-container:not(:last-child), .table:not(:last-child), .progress:not(:last-child), .notification:not(:last-child), .content:not(:last-child), .box:not(:last-child) {\n  margin-bottom: 1.5rem;\n}\n\n.modal-close, .delete {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n  -moz-appearance: none;\n  -webkit-appearance: none;\n  background-color: rgba(10, 10, 10, 0.2);\n  border: none;\n  border-radius: 9999px;\n  cursor: pointer;\n  pointer-events: auto;\n  display: inline-block;\n  flex-grow: 0;\n  flex-shrink: 0;\n  font-size: 0;\n  height: 20px;\n  max-height: 20px;\n  max-width: 20px;\n  min-height: 20px;\n  min-width: 20px;\n  outline: none;\n  position: relative;\n  vertical-align: top;\n  width: 20px;\n}\n.modal-close::before, .delete::before, .modal-close::after, .delete::after {\n  background-color: hsl(0, 0%, 100%);\n  content: \"\";\n  display: block;\n  left: 50%;\n  position: absolute;\n  top: 50%;\n  transform: translateX(-50%) translateY(-50%) rotate(45deg);\n  transform-origin: center center;\n}\n.modal-close::before, .delete::before {\n  height: 2px;\n  width: 50%;\n}\n.modal-close::after, .delete::after {\n  height: 50%;\n  width: 2px;\n}\n.modal-close:hover, .delete:hover, .modal-close:focus, .delete:focus {\n  background-color: rgba(10, 10, 10, 0.3);\n}\n.modal-close:active, .delete:active {\n  background-color: rgba(10, 10, 10, 0.4);\n}\n.is-small.modal-close, .is-small.delete {\n  height: 16px;\n  max-height: 16px;\n  max-width: 16px;\n  min-height: 16px;\n  min-width: 16px;\n  width: 16px;\n}\n.is-medium.modal-close, .is-medium.delete {\n  height: 24px;\n  max-height: 24px;\n  max-width: 24px;\n  min-height: 24px;\n  min-width: 24px;\n  width: 24px;\n}\n.is-large.modal-close, .is-large.delete {\n  height: 32px;\n  max-height: 32px;\n  max-width: 32px;\n  min-height: 32px;\n  min-width: 32px;\n  width: 32px;\n}\n\n.control.is-loading::after, .select.is-loading::after, .loader, .button.is-loading::after {\n  animation: spinAround 500ms infinite linear;\n  border: 2px solid hsl(0, 0%, 86%);\n  border-radius: 9999px;\n  border-right-color: transparent;\n  border-top-color: transparent;\n  content: \"\";\n  display: block;\n  height: 1em;\n  position: relative;\n  width: 1em;\n}\n\n.hero-video, .is-overlay, .modal-background, .modal, .image.is-square img,\n.image.is-square .has-ratio, .image.is-1by1 img,\n.image.is-1by1 .has-ratio, .image.is-5by4 img,\n.image.is-5by4 .has-ratio, .image.is-4by3 img,\n.image.is-4by3 .has-ratio, .image.is-3by2 img,\n.image.is-3by2 .has-ratio, .image.is-5by3 img,\n.image.is-5by3 .has-ratio, .image.is-16by9 img,\n.image.is-16by9 .has-ratio, .image.is-2by1 img,\n.image.is-2by1 .has-ratio, .image.is-3by1 img,\n.image.is-3by1 .has-ratio, .image.is-4by5 img,\n.image.is-4by5 .has-ratio, .image.is-3by4 img,\n.image.is-3by4 .has-ratio, .image.is-2by3 img,\n.image.is-2by3 .has-ratio, .image.is-3by5 img,\n.image.is-3by5 .has-ratio, .image.is-9by16 img,\n.image.is-9by16 .has-ratio, .image.is-1by2 img,\n.image.is-1by2 .has-ratio, .image.is-1by3 img,\n.image.is-1by3 .has-ratio {\n  bottom: 0;\n  left: 0;\n  position: absolute;\n  right: 0;\n  top: 0;\n}\n\n.navbar-burger {\n  -moz-appearance: none;\n  -webkit-appearance: none;\n  appearance: none;\n  background: none;\n  border: none;\n  color: currentColor;\n  font-family: inherit;\n  font-size: 1em;\n  margin: 0;\n  padding: 0;\n}\n\n/* Bulma Base */\n/*! minireset.css v0.0.6 | MIT License | github.com/jgthms/minireset.css */\nhtml,\nbody,\np,\nol,\nul,\nli,\ndl,\ndt,\ndd,\nblockquote,\nfigure,\nfieldset,\nlegend,\ntextarea,\npre,\niframe,\nhr,\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  margin: 0;\n  padding: 0;\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  font-size: 100%;\n  font-weight: normal;\n}\n\nul {\n  list-style: none;\n}\n\nbutton,\ninput,\nselect,\ntextarea {\n  margin: 0;\n}\n\nhtml {\n  box-sizing: border-box;\n}\n\n*, *::before, *::after {\n  box-sizing: inherit;\n}\n\nimg,\nvideo {\n  height: auto;\n  max-width: 100%;\n}\n\niframe {\n  border: 0;\n}\n\ntable {\n  border-collapse: collapse;\n  border-spacing: 0;\n}\n\ntd,\nth {\n  padding: 0;\n}\ntd:not([align]),\nth:not([align]) {\n  text-align: inherit;\n}\n\nhtml {\n  background-color: #242424;\n  font-size: 16px;\n  -moz-osx-font-smoothing: grayscale;\n  -webkit-font-smoothing: antialiased;\n  min-width: 300px;\n  overflow-x: hidden;\n  overflow-y: scroll;\n  text-rendering: optimizeLegibility;\n  text-size-adjust: 100%;\n}\n\narticle,\naside,\nfigure,\nfooter,\nheader,\nhgroup,\nsection {\n  display: block;\n}\n\nbody,\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  font-family: \"Nunito\", sans-serif;\n}\n\ncode,\npre {\n  -moz-osx-font-smoothing: auto;\n  -webkit-font-smoothing: auto;\n  font-family: monospace;\n}\n\nbody {\n  color: #363636;\n  font-size: 1em;\n  font-weight: 400;\n  line-height: 1.5;\n}\n\na {\n  color: #3273dc;\n  cursor: pointer;\n  text-decoration: none;\n}\na strong {\n  color: currentColor;\n}\na:hover {\n  color: #242424;\n}\n\ncode {\n  background-color: hsl(0, 0%, 96%);\n  color: #da1039;\n  font-size: 0.875em;\n  font-weight: normal;\n  padding: 0.25em 0.5em 0.25em;\n}\n\nhr {\n  background-color: hsl(0, 0%, 96%);\n  border: none;\n  display: block;\n  height: 2px;\n  margin: 1.5rem 0;\n}\n\nimg {\n  height: auto;\n  max-width: 100%;\n}\n\ninput[type=checkbox],\ninput[type=radio] {\n  vertical-align: baseline;\n}\n\nsmall {\n  font-size: 0.875em;\n}\n\nspan {\n  font-style: inherit;\n  font-weight: inherit;\n}\n\nstrong {\n  color: #242424;\n  font-weight: 700;\n}\n\nfieldset {\n  border: none;\n}\n\npre {\n  -webkit-overflow-scrolling: touch;\n  background-color: hsl(0, 0%, 96%);\n  color: #363636;\n  font-size: 0.875em;\n  overflow-x: auto;\n  padding: 1.25rem 1.5rem;\n  white-space: pre;\n  word-wrap: normal;\n}\npre code {\n  background-color: transparent;\n  color: currentColor;\n  font-size: 1em;\n  padding: 0;\n}\n\ntable td,\ntable th {\n  vertical-align: top;\n}\ntable td:not([align]),\ntable th:not([align]) {\n  text-align: inherit;\n}\ntable th {\n  color: #242424;\n}\n\n@keyframes spinAround {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(359deg);\n  }\n}\n/* Bulma Elements */\n.box {\n  background-color: hsl(0, 0%, 100%);\n  border-radius: 6px;\n  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);\n  color: #363636;\n  display: block;\n  padding: 1.25rem;\n}\n\na.box:hover, a.box:focus {\n  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0 0 1px #3273dc;\n}\na.box:active {\n  box-shadow: inset 0 1px 2px rgba(10, 10, 10, 0.2), 0 0 0 1px #3273dc;\n}\n\n.button {\n  background-color: #dbdbdb;\n  border-color: #363636;\n  border-width: 2px;\n  color: #363636;\n  cursor: pointer;\n  justify-content: center;\n  padding-bottom: calc(0.5em - 2px);\n  padding-left: 1em;\n  padding-right: 1em;\n  padding-top: calc(0.5em - 2px);\n  text-align: center;\n  white-space: nowrap;\n}\n.button strong {\n  color: inherit;\n}\n.button .icon, .button .icon.is-small, .button .icon.is-medium, .button .icon.is-large {\n  height: 1.5em;\n  width: 1.5em;\n}\n.button .icon:first-child:not(:last-child) {\n  margin-left: calc(-0.5em - 2px);\n  margin-right: 0.25em;\n}\n.button .icon:last-child:not(:first-child) {\n  margin-left: 0.25em;\n  margin-right: calc(-0.5em - 2px);\n}\n.button .icon:first-child:last-child {\n  margin-left: calc(-0.5em - 2px);\n  margin-right: calc(-0.5em - 2px);\n}\n.button:hover, .button.is-hovered {\n  border-color: #dbdbdb;\n  color: #242424;\n}\n.button:focus, .button.is-focused {\n  border-color: hsl(229, 53%, 53%);\n  color: #242424;\n}\n.button:focus:not(:active), .button.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(50, 115, 220, 0.25);\n}\n.button:active, .button.is-active {\n  border-color: #363636;\n  color: #242424;\n}\n.button.is-text {\n  background-color: transparent;\n  border-color: transparent;\n  color: #363636;\n  text-decoration: underline;\n}\n.button.is-text:hover, .button.is-text.is-hovered, .button.is-text:focus, .button.is-text.is-focused {\n  background-color: hsl(0, 0%, 96%);\n  color: #242424;\n}\n.button.is-text:active, .button.is-text.is-active {\n  background-color: #e8e8e8;\n  color: #242424;\n}\n.button.is-text[disabled], fieldset[disabled] .button.is-text {\n  background-color: transparent;\n  border-color: transparent;\n  box-shadow: none;\n}\n.button.is-ghost {\n  background: none;\n  border-color: transparent;\n  color: #3273dc;\n  text-decoration: none;\n}\n.button.is-ghost:hover, .button.is-ghost.is-hovered {\n  color: #3273dc;\n  text-decoration: underline;\n}\n.button.is-white {\n  background-color: hsl(0, 0%, 100%);\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-white:hover, .button.is-white.is-hovered {\n  background-color: #f9f9f9;\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-white:focus, .button.is-white.is-focused {\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-white:focus:not(:active), .button.is-white.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(255, 255, 255, 0.25);\n}\n.button.is-white:active, .button.is-white.is-active {\n  background-color: #f2f2f2;\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-white[disabled], fieldset[disabled] .button.is-white {\n  background-color: hsl(0, 0%, 100%);\n  border-color: hsl(0, 0%, 100%);\n  box-shadow: none;\n}\n.button.is-white.is-inverted {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.button.is-white.is-inverted:hover, .button.is-white.is-inverted.is-hovered {\n  background-color: black;\n}\n.button.is-white.is-inverted[disabled], fieldset[disabled] .button.is-white.is-inverted {\n  background-color: hsl(0, 0%, 4%);\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-white.is-loading::after {\n  border-color: transparent transparent hsl(0, 0%, 4%) hsl(0, 0%, 4%) !important;\n}\n.button.is-white.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 100%);\n}\n.button.is-white.is-outlined:hover, .button.is-white.is-outlined.is-hovered, .button.is-white.is-outlined:focus, .button.is-white.is-outlined.is-focused {\n  background-color: hsl(0, 0%, 100%);\n  border-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.button.is-white.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(0, 0%, 100%) hsl(0, 0%, 100%) !important;\n}\n.button.is-white.is-outlined.is-loading:hover::after, .button.is-white.is-outlined.is-loading.is-hovered::after, .button.is-white.is-outlined.is-loading:focus::after, .button.is-white.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(0, 0%, 4%) hsl(0, 0%, 4%) !important;\n}\n.button.is-white.is-outlined[disabled], fieldset[disabled] .button.is-white.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 100%);\n  box-shadow: none;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-white.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 4%);\n}\n.button.is-white.is-inverted.is-outlined:hover, .button.is-white.is-inverted.is-outlined.is-hovered, .button.is-white.is-inverted.is-outlined:focus, .button.is-white.is-inverted.is-outlined.is-focused {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.button.is-white.is-inverted.is-outlined.is-loading:hover::after, .button.is-white.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-white.is-inverted.is-outlined.is-loading:focus::after, .button.is-white.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(0, 0%, 100%) hsl(0, 0%, 100%) !important;\n}\n.button.is-white.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-white.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 4%);\n  box-shadow: none;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-black {\n  background-color: hsl(0, 0%, 4%);\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-black:hover, .button.is-black.is-hovered {\n  background-color: #040404;\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-black:focus, .button.is-black.is-focused {\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-black:focus:not(:active), .button.is-black.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(10, 10, 10, 0.25);\n}\n.button.is-black:active, .button.is-black.is-active {\n  background-color: black;\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-black[disabled], fieldset[disabled] .button.is-black {\n  background-color: hsl(0, 0%, 4%);\n  border-color: hsl(0, 0%, 4%);\n  box-shadow: none;\n}\n.button.is-black.is-inverted {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.button.is-black.is-inverted:hover, .button.is-black.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-black.is-inverted[disabled], fieldset[disabled] .button.is-black.is-inverted {\n  background-color: hsl(0, 0%, 100%);\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-black.is-loading::after {\n  border-color: transparent transparent hsl(0, 0%, 100%) hsl(0, 0%, 100%) !important;\n}\n.button.is-black.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 4%);\n}\n.button.is-black.is-outlined:hover, .button.is-black.is-outlined.is-hovered, .button.is-black.is-outlined:focus, .button.is-black.is-outlined.is-focused {\n  background-color: hsl(0, 0%, 4%);\n  border-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.button.is-black.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(0, 0%, 4%) hsl(0, 0%, 4%) !important;\n}\n.button.is-black.is-outlined.is-loading:hover::after, .button.is-black.is-outlined.is-loading.is-hovered::after, .button.is-black.is-outlined.is-loading:focus::after, .button.is-black.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(0, 0%, 100%) hsl(0, 0%, 100%) !important;\n}\n.button.is-black.is-outlined[disabled], fieldset[disabled] .button.is-black.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 4%);\n  box-shadow: none;\n  color: hsl(0, 0%, 4%);\n}\n.button.is-black.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 100%);\n}\n.button.is-black.is-inverted.is-outlined:hover, .button.is-black.is-inverted.is-outlined.is-hovered, .button.is-black.is-inverted.is-outlined:focus, .button.is-black.is-inverted.is-outlined.is-focused {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.button.is-black.is-inverted.is-outlined.is-loading:hover::after, .button.is-black.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-black.is-inverted.is-outlined.is-loading:focus::after, .button.is-black.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(0, 0%, 4%) hsl(0, 0%, 4%) !important;\n}\n.button.is-black.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-black.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 100%);\n  box-shadow: none;\n  color: hsl(0, 0%, 100%);\n}\n.button.is-light {\n  background-color: hsl(0, 0%, 96%);\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light:hover, .button.is-light.is-hovered {\n  background-color: #eeeeee;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light:focus, .button.is-light.is-focused {\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light:focus:not(:active), .button.is-light.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(245, 245, 245, 0.25);\n}\n.button.is-light:active, .button.is-light.is-active {\n  background-color: #e8e8e8;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light[disabled], fieldset[disabled] .button.is-light {\n  background-color: hsl(0, 0%, 96%);\n  border-color: hsl(0, 0%, 96%);\n  box-shadow: none;\n}\n.button.is-light.is-inverted {\n  background-color: rgba(0, 0, 0, 0.7);\n  color: hsl(0, 0%, 96%);\n}\n.button.is-light.is-inverted:hover, .button.is-light.is-inverted.is-hovered {\n  background-color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light.is-inverted[disabled], fieldset[disabled] .button.is-light.is-inverted {\n  background-color: rgba(0, 0, 0, 0.7);\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(0, 0%, 96%);\n}\n.button.is-light.is-loading::after {\n  border-color: transparent transparent rgba(0, 0, 0, 0.7) rgba(0, 0, 0, 0.7) !important;\n}\n.button.is-light.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 96%);\n  color: hsl(0, 0%, 96%);\n}\n.button.is-light.is-outlined:hover, .button.is-light.is-outlined.is-hovered, .button.is-light.is-outlined:focus, .button.is-light.is-outlined.is-focused {\n  background-color: hsl(0, 0%, 96%);\n  border-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(0, 0%, 96%) hsl(0, 0%, 96%) !important;\n}\n.button.is-light.is-outlined.is-loading:hover::after, .button.is-light.is-outlined.is-loading.is-hovered::after, .button.is-light.is-outlined.is-loading:focus::after, .button.is-light.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent rgba(0, 0, 0, 0.7) rgba(0, 0, 0, 0.7) !important;\n}\n.button.is-light.is-outlined[disabled], fieldset[disabled] .button.is-light.is-outlined {\n  background-color: transparent;\n  border-color: hsl(0, 0%, 96%);\n  box-shadow: none;\n  color: hsl(0, 0%, 96%);\n}\n.button.is-light.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: rgba(0, 0, 0, 0.7);\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-light.is-inverted.is-outlined:hover, .button.is-light.is-inverted.is-outlined.is-hovered, .button.is-light.is-inverted.is-outlined:focus, .button.is-light.is-inverted.is-outlined.is-focused {\n  background-color: rgba(0, 0, 0, 0.7);\n  color: hsl(0, 0%, 96%);\n}\n.button.is-light.is-inverted.is-outlined.is-loading:hover::after, .button.is-light.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-light.is-inverted.is-outlined.is-loading:focus::after, .button.is-light.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(0, 0%, 96%) hsl(0, 0%, 96%) !important;\n}\n.button.is-light.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-light.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: rgba(0, 0, 0, 0.7);\n  box-shadow: none;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-dark {\n  background-color: #242424;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-dark:hover, .button.is-dark.is-hovered {\n  background-color: #1e1e1e;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-dark:focus, .button.is-dark.is-focused {\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-dark:focus:not(:active), .button.is-dark.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(36, 36, 36, 0.25);\n}\n.button.is-dark:active, .button.is-dark.is-active {\n  background-color: #171717;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-dark[disabled], fieldset[disabled] .button.is-dark {\n  background-color: #242424;\n  border-color: #242424;\n  box-shadow: none;\n}\n.button.is-dark.is-inverted {\n  background-color: #fff;\n  color: #242424;\n}\n.button.is-dark.is-inverted:hover, .button.is-dark.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-dark.is-inverted[disabled], fieldset[disabled] .button.is-dark.is-inverted {\n  background-color: #fff;\n  border-color: transparent;\n  box-shadow: none;\n  color: #242424;\n}\n.button.is-dark.is-loading::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-dark.is-outlined {\n  background-color: transparent;\n  border-color: #242424;\n  color: #242424;\n}\n.button.is-dark.is-outlined:hover, .button.is-dark.is-outlined.is-hovered, .button.is-dark.is-outlined:focus, .button.is-dark.is-outlined.is-focused {\n  background-color: #242424;\n  border-color: #242424;\n  color: #fff;\n}\n.button.is-dark.is-outlined.is-loading::after {\n  border-color: transparent transparent #242424 #242424 !important;\n}\n.button.is-dark.is-outlined.is-loading:hover::after, .button.is-dark.is-outlined.is-loading.is-hovered::after, .button.is-dark.is-outlined.is-loading:focus::after, .button.is-dark.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-dark.is-outlined[disabled], fieldset[disabled] .button.is-dark.is-outlined {\n  background-color: transparent;\n  border-color: #242424;\n  box-shadow: none;\n  color: #242424;\n}\n.button.is-dark.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  color: #fff;\n}\n.button.is-dark.is-inverted.is-outlined:hover, .button.is-dark.is-inverted.is-outlined.is-hovered, .button.is-dark.is-inverted.is-outlined:focus, .button.is-dark.is-inverted.is-outlined.is-focused {\n  background-color: #fff;\n  color: #242424;\n}\n.button.is-dark.is-inverted.is-outlined.is-loading:hover::after, .button.is-dark.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-dark.is-inverted.is-outlined.is-loading:focus::after, .button.is-dark.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #242424 #242424 !important;\n}\n.button.is-dark.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-dark.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  box-shadow: none;\n  color: #fff;\n}\n.button.is-primary {\n  background-color: #00d1b2;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-primary:hover, .button.is-primary.is-hovered {\n  background-color: #00c4a7;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-primary:focus, .button.is-primary.is-focused {\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-primary:focus:not(:active), .button.is-primary.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(0, 209, 178, 0.25);\n}\n.button.is-primary:active, .button.is-primary.is-active {\n  background-color: #00b89c;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-primary[disabled], fieldset[disabled] .button.is-primary {\n  background-color: #00d1b2;\n  border-color: #00d1b2;\n  box-shadow: none;\n}\n.button.is-primary.is-inverted {\n  background-color: #fff;\n  color: #00d1b2;\n}\n.button.is-primary.is-inverted:hover, .button.is-primary.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-primary.is-inverted[disabled], fieldset[disabled] .button.is-primary.is-inverted {\n  background-color: #fff;\n  border-color: transparent;\n  box-shadow: none;\n  color: #00d1b2;\n}\n.button.is-primary.is-loading::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-primary.is-outlined {\n  background-color: transparent;\n  border-color: #00d1b2;\n  color: #00d1b2;\n}\n.button.is-primary.is-outlined:hover, .button.is-primary.is-outlined.is-hovered, .button.is-primary.is-outlined:focus, .button.is-primary.is-outlined.is-focused {\n  background-color: #00d1b2;\n  border-color: #00d1b2;\n  color: #fff;\n}\n.button.is-primary.is-outlined.is-loading::after {\n  border-color: transparent transparent #00d1b2 #00d1b2 !important;\n}\n.button.is-primary.is-outlined.is-loading:hover::after, .button.is-primary.is-outlined.is-loading.is-hovered::after, .button.is-primary.is-outlined.is-loading:focus::after, .button.is-primary.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-primary.is-outlined[disabled], fieldset[disabled] .button.is-primary.is-outlined {\n  background-color: transparent;\n  border-color: #00d1b2;\n  box-shadow: none;\n  color: #00d1b2;\n}\n.button.is-primary.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  color: #fff;\n}\n.button.is-primary.is-inverted.is-outlined:hover, .button.is-primary.is-inverted.is-outlined.is-hovered, .button.is-primary.is-inverted.is-outlined:focus, .button.is-primary.is-inverted.is-outlined.is-focused {\n  background-color: #fff;\n  color: #00d1b2;\n}\n.button.is-primary.is-inverted.is-outlined.is-loading:hover::after, .button.is-primary.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-primary.is-inverted.is-outlined.is-loading:focus::after, .button.is-primary.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #00d1b2 #00d1b2 !important;\n}\n.button.is-primary.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-primary.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  box-shadow: none;\n  color: #fff;\n}\n.button.is-primary.is-light {\n  background-color: #ebfffc;\n  color: #00947e;\n}\n.button.is-primary.is-light:hover, .button.is-primary.is-light.is-hovered {\n  background-color: #defffa;\n  border-color: transparent;\n  color: #00947e;\n}\n.button.is-primary.is-light:active, .button.is-primary.is-light.is-active {\n  background-color: #d1fff8;\n  border-color: transparent;\n  color: #00947e;\n}\n.button.is-link {\n  background-color: #3273dc;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-link:hover, .button.is-link.is-hovered {\n  background-color: #276cda;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-link:focus, .button.is-link.is-focused {\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-link:focus:not(:active), .button.is-link.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(50, 115, 220, 0.25);\n}\n.button.is-link:active, .button.is-link.is-active {\n  background-color: #2466d1;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-link[disabled], fieldset[disabled] .button.is-link {\n  background-color: #3273dc;\n  border-color: #3273dc;\n  box-shadow: none;\n}\n.button.is-link.is-inverted {\n  background-color: #fff;\n  color: #3273dc;\n}\n.button.is-link.is-inverted:hover, .button.is-link.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-link.is-inverted[disabled], fieldset[disabled] .button.is-link.is-inverted {\n  background-color: #fff;\n  border-color: transparent;\n  box-shadow: none;\n  color: #3273dc;\n}\n.button.is-link.is-loading::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-link.is-outlined {\n  background-color: transparent;\n  border-color: #3273dc;\n  color: #3273dc;\n}\n.button.is-link.is-outlined:hover, .button.is-link.is-outlined.is-hovered, .button.is-link.is-outlined:focus, .button.is-link.is-outlined.is-focused {\n  background-color: #3273dc;\n  border-color: #3273dc;\n  color: #fff;\n}\n.button.is-link.is-outlined.is-loading::after {\n  border-color: transparent transparent #3273dc #3273dc !important;\n}\n.button.is-link.is-outlined.is-loading:hover::after, .button.is-link.is-outlined.is-loading.is-hovered::after, .button.is-link.is-outlined.is-loading:focus::after, .button.is-link.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-link.is-outlined[disabled], fieldset[disabled] .button.is-link.is-outlined {\n  background-color: transparent;\n  border-color: #3273dc;\n  box-shadow: none;\n  color: #3273dc;\n}\n.button.is-link.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  color: #fff;\n}\n.button.is-link.is-inverted.is-outlined:hover, .button.is-link.is-inverted.is-outlined.is-hovered, .button.is-link.is-inverted.is-outlined:focus, .button.is-link.is-inverted.is-outlined.is-focused {\n  background-color: #fff;\n  color: #3273dc;\n}\n.button.is-link.is-inverted.is-outlined.is-loading:hover::after, .button.is-link.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-link.is-inverted.is-outlined.is-loading:focus::after, .button.is-link.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #3273dc #3273dc !important;\n}\n.button.is-link.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-link.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  box-shadow: none;\n  color: #fff;\n}\n.button.is-link.is-light {\n  background-color: #eef3fc;\n  color: #2160c4;\n}\n.button.is-link.is-light:hover, .button.is-link.is-light.is-hovered {\n  background-color: #e3ecfa;\n  border-color: transparent;\n  color: #2160c4;\n}\n.button.is-link.is-light:active, .button.is-link.is-light.is-active {\n  background-color: #d8e4f8;\n  border-color: transparent;\n  color: #2160c4;\n}\n.button.is-info {\n  background-color: hsl(207, 61%, 53%);\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-info:hover, .button.is-info.is-hovered {\n  background-color: #3488ce;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-info:focus, .button.is-info.is-focused {\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-info:focus:not(:active), .button.is-info.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(62, 142, 208, 0.25);\n}\n.button.is-info:active, .button.is-info.is-active {\n  background-color: #3082c5;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-info[disabled], fieldset[disabled] .button.is-info {\n  background-color: hsl(207, 61%, 53%);\n  border-color: hsl(207, 61%, 53%);\n  box-shadow: none;\n}\n.button.is-info.is-inverted {\n  background-color: #fff;\n  color: hsl(207, 61%, 53%);\n}\n.button.is-info.is-inverted:hover, .button.is-info.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-info.is-inverted[disabled], fieldset[disabled] .button.is-info.is-inverted {\n  background-color: #fff;\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(207, 61%, 53%);\n}\n.button.is-info.is-loading::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-info.is-outlined {\n  background-color: transparent;\n  border-color: hsl(207, 61%, 53%);\n  color: hsl(207, 61%, 53%);\n}\n.button.is-info.is-outlined:hover, .button.is-info.is-outlined.is-hovered, .button.is-info.is-outlined:focus, .button.is-info.is-outlined.is-focused {\n  background-color: hsl(207, 61%, 53%);\n  border-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.button.is-info.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(207, 61%, 53%) hsl(207, 61%, 53%) !important;\n}\n.button.is-info.is-outlined.is-loading:hover::after, .button.is-info.is-outlined.is-loading.is-hovered::after, .button.is-info.is-outlined.is-loading:focus::after, .button.is-info.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-info.is-outlined[disabled], fieldset[disabled] .button.is-info.is-outlined {\n  background-color: transparent;\n  border-color: hsl(207, 61%, 53%);\n  box-shadow: none;\n  color: hsl(207, 61%, 53%);\n}\n.button.is-info.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  color: #fff;\n}\n.button.is-info.is-inverted.is-outlined:hover, .button.is-info.is-inverted.is-outlined.is-hovered, .button.is-info.is-inverted.is-outlined:focus, .button.is-info.is-inverted.is-outlined.is-focused {\n  background-color: #fff;\n  color: hsl(207, 61%, 53%);\n}\n.button.is-info.is-inverted.is-outlined.is-loading:hover::after, .button.is-info.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-info.is-inverted.is-outlined.is-loading:focus::after, .button.is-info.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(207, 61%, 53%) hsl(207, 61%, 53%) !important;\n}\n.button.is-info.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-info.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  box-shadow: none;\n  color: #fff;\n}\n.button.is-info.is-light {\n  background-color: #eff5fb;\n  color: #296fa8;\n}\n.button.is-info.is-light:hover, .button.is-info.is-light.is-hovered {\n  background-color: #e4eff9;\n  border-color: transparent;\n  color: #296fa8;\n}\n.button.is-info.is-light:active, .button.is-info.is-light.is-active {\n  background-color: #dae9f6;\n  border-color: transparent;\n  color: #296fa8;\n}\n.button.is-success {\n  background-color: hsl(153, 53%, 53%);\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-success:hover, .button.is-success.is-hovered {\n  background-color: #3ec487;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-success:focus, .button.is-success.is-focused {\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-success:focus:not(:active), .button.is-success.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(72, 199, 142, 0.25);\n}\n.button.is-success:active, .button.is-success.is-active {\n  background-color: #3abb81;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-success[disabled], fieldset[disabled] .button.is-success {\n  background-color: hsl(153, 53%, 53%);\n  border-color: hsl(153, 53%, 53%);\n  box-shadow: none;\n}\n.button.is-success.is-inverted {\n  background-color: #fff;\n  color: hsl(153, 53%, 53%);\n}\n.button.is-success.is-inverted:hover, .button.is-success.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-success.is-inverted[disabled], fieldset[disabled] .button.is-success.is-inverted {\n  background-color: #fff;\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(153, 53%, 53%);\n}\n.button.is-success.is-loading::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-success.is-outlined {\n  background-color: transparent;\n  border-color: hsl(153, 53%, 53%);\n  color: hsl(153, 53%, 53%);\n}\n.button.is-success.is-outlined:hover, .button.is-success.is-outlined.is-hovered, .button.is-success.is-outlined:focus, .button.is-success.is-outlined.is-focused {\n  background-color: hsl(153, 53%, 53%);\n  border-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.button.is-success.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(153, 53%, 53%) hsl(153, 53%, 53%) !important;\n}\n.button.is-success.is-outlined.is-loading:hover::after, .button.is-success.is-outlined.is-loading.is-hovered::after, .button.is-success.is-outlined.is-loading:focus::after, .button.is-success.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-success.is-outlined[disabled], fieldset[disabled] .button.is-success.is-outlined {\n  background-color: transparent;\n  border-color: hsl(153, 53%, 53%);\n  box-shadow: none;\n  color: hsl(153, 53%, 53%);\n}\n.button.is-success.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  color: #fff;\n}\n.button.is-success.is-inverted.is-outlined:hover, .button.is-success.is-inverted.is-outlined.is-hovered, .button.is-success.is-inverted.is-outlined:focus, .button.is-success.is-inverted.is-outlined.is-focused {\n  background-color: #fff;\n  color: hsl(153, 53%, 53%);\n}\n.button.is-success.is-inverted.is-outlined.is-loading:hover::after, .button.is-success.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-success.is-inverted.is-outlined.is-loading:focus::after, .button.is-success.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(153, 53%, 53%) hsl(153, 53%, 53%) !important;\n}\n.button.is-success.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-success.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  box-shadow: none;\n  color: #fff;\n}\n.button.is-success.is-light {\n  background-color: #effaf5;\n  color: #257953;\n}\n.button.is-success.is-light:hover, .button.is-success.is-light.is-hovered {\n  background-color: #e6f7ef;\n  border-color: transparent;\n  color: #257953;\n}\n.button.is-success.is-light:active, .button.is-success.is-light.is-active {\n  background-color: #dcf4e9;\n  border-color: transparent;\n  color: #257953;\n}\n.button.is-warning {\n  background-color: hsl(44, 100%, 77%);\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning:hover, .button.is-warning.is-hovered {\n  background-color: #ffdc7d;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning:focus, .button.is-warning.is-focused {\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning:focus:not(:active), .button.is-warning.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(255, 224, 138, 0.25);\n}\n.button.is-warning:active, .button.is-warning.is-active {\n  background-color: #ffd970;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning[disabled], fieldset[disabled] .button.is-warning {\n  background-color: hsl(44, 100%, 77%);\n  border-color: hsl(44, 100%, 77%);\n  box-shadow: none;\n}\n.button.is-warning.is-inverted {\n  background-color: rgba(0, 0, 0, 0.7);\n  color: hsl(44, 100%, 77%);\n}\n.button.is-warning.is-inverted:hover, .button.is-warning.is-inverted.is-hovered {\n  background-color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning.is-inverted[disabled], fieldset[disabled] .button.is-warning.is-inverted {\n  background-color: rgba(0, 0, 0, 0.7);\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(44, 100%, 77%);\n}\n.button.is-warning.is-loading::after {\n  border-color: transparent transparent rgba(0, 0, 0, 0.7) rgba(0, 0, 0, 0.7) !important;\n}\n.button.is-warning.is-outlined {\n  background-color: transparent;\n  border-color: hsl(44, 100%, 77%);\n  color: hsl(44, 100%, 77%);\n}\n.button.is-warning.is-outlined:hover, .button.is-warning.is-outlined.is-hovered, .button.is-warning.is-outlined:focus, .button.is-warning.is-outlined.is-focused {\n  background-color: hsl(44, 100%, 77%);\n  border-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(44, 100%, 77%) hsl(44, 100%, 77%) !important;\n}\n.button.is-warning.is-outlined.is-loading:hover::after, .button.is-warning.is-outlined.is-loading.is-hovered::after, .button.is-warning.is-outlined.is-loading:focus::after, .button.is-warning.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent rgba(0, 0, 0, 0.7) rgba(0, 0, 0, 0.7) !important;\n}\n.button.is-warning.is-outlined[disabled], fieldset[disabled] .button.is-warning.is-outlined {\n  background-color: transparent;\n  border-color: hsl(44, 100%, 77%);\n  box-shadow: none;\n  color: hsl(44, 100%, 77%);\n}\n.button.is-warning.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: rgba(0, 0, 0, 0.7);\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning.is-inverted.is-outlined:hover, .button.is-warning.is-inverted.is-outlined.is-hovered, .button.is-warning.is-inverted.is-outlined:focus, .button.is-warning.is-inverted.is-outlined.is-focused {\n  background-color: rgba(0, 0, 0, 0.7);\n  color: hsl(44, 100%, 77%);\n}\n.button.is-warning.is-inverted.is-outlined.is-loading:hover::after, .button.is-warning.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-warning.is-inverted.is-outlined.is-loading:focus::after, .button.is-warning.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(44, 100%, 77%) hsl(44, 100%, 77%) !important;\n}\n.button.is-warning.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-warning.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: rgba(0, 0, 0, 0.7);\n  box-shadow: none;\n  color: rgba(0, 0, 0, 0.7);\n}\n.button.is-warning.is-light {\n  background-color: #fffaeb;\n  color: #946c00;\n}\n.button.is-warning.is-light:hover, .button.is-warning.is-light.is-hovered {\n  background-color: #fff6de;\n  border-color: transparent;\n  color: #946c00;\n}\n.button.is-warning.is-light:active, .button.is-warning.is-light.is-active {\n  background-color: #fff3d1;\n  border-color: transparent;\n  color: #946c00;\n}\n.button.is-danger {\n  background-color: hsl(348, 86%, 61%);\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-danger:hover, .button.is-danger.is-hovered {\n  background-color: #f03a5f;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-danger:focus, .button.is-danger.is-focused {\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-danger:focus:not(:active), .button.is-danger.is-focused:not(:active) {\n  box-shadow: 0 0 0 0.125em rgba(241, 70, 104, 0.25);\n}\n.button.is-danger:active, .button.is-danger.is-active {\n  background-color: #ef2e55;\n  border-color: transparent;\n  color: #fff;\n}\n.button.is-danger[disabled], fieldset[disabled] .button.is-danger {\n  background-color: hsl(348, 86%, 61%);\n  border-color: hsl(348, 86%, 61%);\n  box-shadow: none;\n}\n.button.is-danger.is-inverted {\n  background-color: #fff;\n  color: hsl(348, 86%, 61%);\n}\n.button.is-danger.is-inverted:hover, .button.is-danger.is-inverted.is-hovered {\n  background-color: #f2f2f2;\n}\n.button.is-danger.is-inverted[disabled], fieldset[disabled] .button.is-danger.is-inverted {\n  background-color: #fff;\n  border-color: transparent;\n  box-shadow: none;\n  color: hsl(348, 86%, 61%);\n}\n.button.is-danger.is-loading::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-danger.is-outlined {\n  background-color: transparent;\n  border-color: hsl(348, 86%, 61%);\n  color: hsl(348, 86%, 61%);\n}\n.button.is-danger.is-outlined:hover, .button.is-danger.is-outlined.is-hovered, .button.is-danger.is-outlined:focus, .button.is-danger.is-outlined.is-focused {\n  background-color: hsl(348, 86%, 61%);\n  border-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.button.is-danger.is-outlined.is-loading::after {\n  border-color: transparent transparent hsl(348, 86%, 61%) hsl(348, 86%, 61%) !important;\n}\n.button.is-danger.is-outlined.is-loading:hover::after, .button.is-danger.is-outlined.is-loading.is-hovered::after, .button.is-danger.is-outlined.is-loading:focus::after, .button.is-danger.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent #fff #fff !important;\n}\n.button.is-danger.is-outlined[disabled], fieldset[disabled] .button.is-danger.is-outlined {\n  background-color: transparent;\n  border-color: hsl(348, 86%, 61%);\n  box-shadow: none;\n  color: hsl(348, 86%, 61%);\n}\n.button.is-danger.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  color: #fff;\n}\n.button.is-danger.is-inverted.is-outlined:hover, .button.is-danger.is-inverted.is-outlined.is-hovered, .button.is-danger.is-inverted.is-outlined:focus, .button.is-danger.is-inverted.is-outlined.is-focused {\n  background-color: #fff;\n  color: hsl(348, 86%, 61%);\n}\n.button.is-danger.is-inverted.is-outlined.is-loading:hover::after, .button.is-danger.is-inverted.is-outlined.is-loading.is-hovered::after, .button.is-danger.is-inverted.is-outlined.is-loading:focus::after, .button.is-danger.is-inverted.is-outlined.is-loading.is-focused::after {\n  border-color: transparent transparent hsl(348, 86%, 61%) hsl(348, 86%, 61%) !important;\n}\n.button.is-danger.is-inverted.is-outlined[disabled], fieldset[disabled] .button.is-danger.is-inverted.is-outlined {\n  background-color: transparent;\n  border-color: #fff;\n  box-shadow: none;\n  color: #fff;\n}\n.button.is-danger.is-light {\n  background-color: #feecf0;\n  color: #cc0f35;\n}\n.button.is-danger.is-light:hover, .button.is-danger.is-light.is-hovered {\n  background-color: #fde0e6;\n  border-color: transparent;\n  color: #cc0f35;\n}\n.button.is-danger.is-light:active, .button.is-danger.is-light.is-active {\n  background-color: #fcd4dc;\n  border-color: transparent;\n  color: #cc0f35;\n}\n.button.is-small {\n  font-size: 0.75rem;\n}\n.button.is-small:not(.is-rounded) {\n  border-radius: 2px;\n}\n.button.is-normal {\n  font-size: 1rem;\n}\n.button.is-medium {\n  font-size: 1.25rem;\n}\n.button.is-large {\n  font-size: 1.5rem;\n}\n.button[disabled], fieldset[disabled] .button {\n  background-color: hsl(0, 0%, 100%);\n  border-color: hsl(0, 0%, 86%);\n  box-shadow: none;\n  opacity: 0.5;\n}\n.button.is-fullwidth {\n  display: flex;\n  width: 100%;\n}\n.button.is-loading {\n  color: transparent !important;\n  pointer-events: none;\n}\n.button.is-loading::after {\n  position: absolute;\n  left: calc(50% - 1em * 0.5);\n  top: calc(50% - 1em * 0.5);\n  position: absolute !important;\n}\n.button.is-static {\n  background-color: hsl(0, 0%, 96%);\n  border-color: hsl(0, 0%, 86%);\n  color: hsl(0, 0%, 48%);\n  box-shadow: none;\n  pointer-events: none;\n}\n.button.is-rounded {\n  border-radius: 9999px;\n  padding-left: calc(1em + 0.25em);\n  padding-right: calc(1em + 0.25em);\n}\n\n.buttons {\n  align-items: center;\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-start;\n}\n.buttons .button {\n  margin-bottom: 0.5rem;\n}\n.buttons .button:not(:last-child):not(.is-fullwidth) {\n  margin-right: 0.5rem;\n}\n.buttons:last-child {\n  margin-bottom: -0.5rem;\n}\n.buttons:not(:last-child) {\n  margin-bottom: 1rem;\n}\n.buttons.are-small .button:not(.is-normal):not(.is-medium):not(.is-large) {\n  font-size: 0.75rem;\n}\n.buttons.are-small .button:not(.is-normal):not(.is-medium):not(.is-large):not(.is-rounded) {\n  border-radius: 2px;\n}\n.buttons.are-medium .button:not(.is-small):not(.is-normal):not(.is-large) {\n  font-size: 1.25rem;\n}\n.buttons.are-large .button:not(.is-small):not(.is-normal):not(.is-medium) {\n  font-size: 1.5rem;\n}\n.buttons.has-addons .button:not(:first-child) {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.buttons.has-addons .button:not(:last-child) {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n  margin-right: -1px;\n}\n.buttons.has-addons .button:last-child {\n  margin-right: 0;\n}\n.buttons.has-addons .button:hover, .buttons.has-addons .button.is-hovered {\n  z-index: 2;\n}\n.buttons.has-addons .button:focus, .buttons.has-addons .button.is-focused, .buttons.has-addons .button:active, .buttons.has-addons .button.is-active, .buttons.has-addons .button.is-selected {\n  z-index: 3;\n}\n.buttons.has-addons .button:focus:hover, .buttons.has-addons .button.is-focused:hover, .buttons.has-addons .button:active:hover, .buttons.has-addons .button.is-active:hover, .buttons.has-addons .button.is-selected:hover {\n  z-index: 4;\n}\n.buttons.has-addons .button.is-expanded {\n  flex-grow: 1;\n  flex-shrink: 1;\n}\n.buttons.is-centered {\n  justify-content: center;\n}\n.buttons.is-centered:not(.has-addons) .button:not(.is-fullwidth) {\n  margin-left: 0.25rem;\n  margin-right: 0.25rem;\n}\n.buttons.is-right {\n  justify-content: flex-end;\n}\n.buttons.is-right:not(.has-addons) .button:not(.is-fullwidth) {\n  margin-left: 0.25rem;\n  margin-right: 0.25rem;\n}\n\n@media screen and (max-width: 768px) {\n  .button.is-responsive.is-small {\n    font-size: 0.5625rem;\n  }\n  .button.is-responsive,\n  .button.is-responsive.is-normal {\n    font-size: 0.65625rem;\n  }\n  .button.is-responsive.is-medium {\n    font-size: 0.75rem;\n  }\n  .button.is-responsive.is-large {\n    font-size: 1rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .button.is-responsive.is-small {\n    font-size: 0.65625rem;\n  }\n  .button.is-responsive,\n  .button.is-responsive.is-normal {\n    font-size: 0.75rem;\n  }\n  .button.is-responsive.is-medium {\n    font-size: 1rem;\n  }\n  .button.is-responsive.is-large {\n    font-size: 1.25rem;\n  }\n}\n.container {\n  flex-grow: 1;\n  margin: 0 auto;\n  position: relative;\n  width: auto;\n}\n.container.is-fluid {\n  max-width: none !important;\n  padding-left: 32px;\n  padding-right: 32px;\n  width: 100%;\n}\n@media screen and (min-width: 1024px) {\n  .container {\n    max-width: 960px;\n  }\n}\n\n.content li + li {\n  margin-top: 0.25em;\n}\n.content p:not(:last-child),\n.content dl:not(:last-child),\n.content ol:not(:last-child),\n.content ul:not(:last-child),\n.content blockquote:not(:last-child),\n.content pre:not(:last-child),\n.content table:not(:last-child) {\n  margin-bottom: 1em;\n}\n.content h1,\n.content h2,\n.content h3,\n.content h4,\n.content h5,\n.content h6 {\n  color: #242424;\n  font-weight: 600;\n  line-height: 1.125;\n}\n.content h1 {\n  font-size: 2em;\n  margin-bottom: 0.5em;\n}\n.content h1:not(:first-child) {\n  margin-top: 1em;\n}\n.content h2 {\n  font-size: 1.75em;\n  margin-bottom: 0.5714em;\n}\n.content h2:not(:first-child) {\n  margin-top: 1.1428em;\n}\n.content h3 {\n  font-size: 1.5em;\n  margin-bottom: 0.6666em;\n}\n.content h3:not(:first-child) {\n  margin-top: 1.3333em;\n}\n.content h4 {\n  font-size: 1.25em;\n  margin-bottom: 0.8em;\n}\n.content h5 {\n  font-size: 1.125em;\n  margin-bottom: 0.8888em;\n}\n.content h6 {\n  font-size: 1em;\n  margin-bottom: 1em;\n}\n.content blockquote {\n  background-color: hsl(0, 0%, 96%);\n  border-left: 5px solid hsl(0, 0%, 86%);\n  padding: 1.25em 1.5em;\n}\n.content ol {\n  list-style-position: outside;\n  margin-left: 2em;\n  margin-top: 1em;\n}\n.content ol:not([type]) {\n  list-style-type: decimal;\n}\n.content ol:not([type]).is-lower-alpha {\n  list-style-type: lower-alpha;\n}\n.content ol:not([type]).is-lower-roman {\n  list-style-type: lower-roman;\n}\n.content ol:not([type]).is-upper-alpha {\n  list-style-type: upper-alpha;\n}\n.content ol:not([type]).is-upper-roman {\n  list-style-type: upper-roman;\n}\n.content ul {\n  list-style: disc outside;\n  margin-left: 2em;\n  margin-top: 1em;\n}\n.content ul ul {\n  list-style-type: circle;\n  margin-top: 0.5em;\n}\n.content ul ul ul {\n  list-style-type: square;\n}\n.content dd {\n  margin-left: 2em;\n}\n.content figure {\n  margin-left: 2em;\n  margin-right: 2em;\n  text-align: center;\n}\n.content figure:not(:first-child) {\n  margin-top: 2em;\n}\n.content figure:not(:last-child) {\n  margin-bottom: 2em;\n}\n.content figure img {\n  display: inline-block;\n}\n.content figure figcaption {\n  font-style: italic;\n}\n.content pre {\n  -webkit-overflow-scrolling: touch;\n  overflow-x: auto;\n  padding: 1.25em 1.5em;\n  white-space: pre;\n  word-wrap: normal;\n}\n.content sup,\n.content sub {\n  font-size: 75%;\n}\n.content table {\n  width: 100%;\n}\n.content table td,\n.content table th {\n  border: 1px solid hsl(0, 0%, 86%);\n  border-width: 0 0 1px;\n  padding: 0.5em 0.75em;\n  vertical-align: top;\n}\n.content table th {\n  color: #242424;\n}\n.content table th:not([align]) {\n  text-align: inherit;\n}\n.content table thead td,\n.content table thead th {\n  border-width: 0 0 2px;\n  color: #242424;\n}\n.content table tfoot td,\n.content table tfoot th {\n  border-width: 2px 0 0;\n  color: #242424;\n}\n.content table tbody tr:last-child td,\n.content table tbody tr:last-child th {\n  border-bottom-width: 0;\n}\n.content .tabs li + li {\n  margin-top: 0;\n}\n.content.is-small {\n  font-size: 0.75rem;\n}\n.content.is-normal {\n  font-size: 1rem;\n}\n.content.is-medium {\n  font-size: 1.25rem;\n}\n.content.is-large {\n  font-size: 1.5rem;\n}\n\n.icon {\n  align-items: center;\n  display: inline-flex;\n  justify-content: center;\n  height: 1.5rem;\n  width: 1.5rem;\n}\n.icon.is-small {\n  height: 1rem;\n  width: 1rem;\n}\n.icon.is-medium {\n  height: 2rem;\n  width: 2rem;\n}\n.icon.is-large {\n  height: 3rem;\n  width: 3rem;\n}\n\n.icon-text {\n  align-items: flex-start;\n  color: inherit;\n  display: inline-flex;\n  flex-wrap: wrap;\n  line-height: 1.5rem;\n  vertical-align: top;\n}\n.icon-text .icon {\n  flex-grow: 0;\n  flex-shrink: 0;\n}\n.icon-text .icon:not(:last-child) {\n  margin-right: 0.25em;\n}\n.icon-text .icon:not(:first-child) {\n  margin-left: 0.25em;\n}\n\ndiv.icon-text {\n  display: flex;\n}\n\n.image {\n  display: block;\n  position: relative;\n}\n.image img {\n  display: block;\n  height: auto;\n  width: 100%;\n}\n.image img.is-rounded {\n  border-radius: 9999px;\n}\n.image.is-fullwidth {\n  width: 100%;\n}\n.image.is-square img,\n.image.is-square .has-ratio, .image.is-1by1 img,\n.image.is-1by1 .has-ratio, .image.is-5by4 img,\n.image.is-5by4 .has-ratio, .image.is-4by3 img,\n.image.is-4by3 .has-ratio, .image.is-3by2 img,\n.image.is-3by2 .has-ratio, .image.is-5by3 img,\n.image.is-5by3 .has-ratio, .image.is-16by9 img,\n.image.is-16by9 .has-ratio, .image.is-2by1 img,\n.image.is-2by1 .has-ratio, .image.is-3by1 img,\n.image.is-3by1 .has-ratio, .image.is-4by5 img,\n.image.is-4by5 .has-ratio, .image.is-3by4 img,\n.image.is-3by4 .has-ratio, .image.is-2by3 img,\n.image.is-2by3 .has-ratio, .image.is-3by5 img,\n.image.is-3by5 .has-ratio, .image.is-9by16 img,\n.image.is-9by16 .has-ratio, .image.is-1by2 img,\n.image.is-1by2 .has-ratio, .image.is-1by3 img,\n.image.is-1by3 .has-ratio {\n  height: 100%;\n  width: 100%;\n}\n.image.is-square, .image.is-1by1 {\n  padding-top: 100%;\n}\n.image.is-5by4 {\n  padding-top: 80%;\n}\n.image.is-4by3 {\n  padding-top: 75%;\n}\n.image.is-3by2 {\n  padding-top: 66.6666%;\n}\n.image.is-5by3 {\n  padding-top: 60%;\n}\n.image.is-16by9 {\n  padding-top: 56.25%;\n}\n.image.is-2by1 {\n  padding-top: 50%;\n}\n.image.is-3by1 {\n  padding-top: 33.3333%;\n}\n.image.is-4by5 {\n  padding-top: 125%;\n}\n.image.is-3by4 {\n  padding-top: 133.3333%;\n}\n.image.is-2by3 {\n  padding-top: 150%;\n}\n.image.is-3by5 {\n  padding-top: 166.6666%;\n}\n.image.is-9by16 {\n  padding-top: 177.7777%;\n}\n.image.is-1by2 {\n  padding-top: 200%;\n}\n.image.is-1by3 {\n  padding-top: 300%;\n}\n.image.is-16x16 {\n  height: 16px;\n  width: 16px;\n}\n.image.is-24x24 {\n  height: 24px;\n  width: 24px;\n}\n.image.is-32x32 {\n  height: 32px;\n  width: 32px;\n}\n.image.is-48x48 {\n  height: 48px;\n  width: 48px;\n}\n.image.is-64x64 {\n  height: 64px;\n  width: 64px;\n}\n.image.is-96x96 {\n  height: 96px;\n  width: 96px;\n}\n.image.is-128x128 {\n  height: 128px;\n  width: 128px;\n}\n\n.notification {\n  background-color: hsl(0, 0%, 96%);\n  border-radius: 4px;\n  position: relative;\n  padding: 1.25rem 2.5rem 1.25rem 1.5rem;\n}\n.notification a:not(.button):not(.dropdown-item) {\n  color: currentColor;\n  text-decoration: underline;\n}\n.notification strong {\n  color: currentColor;\n}\n.notification code,\n.notification pre {\n  background: hsl(0, 0%, 100%);\n}\n.notification pre code {\n  background: transparent;\n}\n.notification > .delete {\n  right: 0.5rem;\n  position: absolute;\n  top: 0.5rem;\n}\n.notification .title,\n.notification .subtitle,\n.notification .content {\n  color: currentColor;\n}\n.notification.is-white {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.notification.is-black {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.notification.is-light {\n  background-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.notification.is-dark {\n  background-color: #242424;\n  color: #fff;\n}\n.notification.is-primary {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.notification.is-primary.is-light {\n  background-color: #ebfffc;\n  color: #00947e;\n}\n.notification.is-link {\n  background-color: #3273dc;\n  color: #fff;\n}\n.notification.is-link.is-light {\n  background-color: #eef3fc;\n  color: #2160c4;\n}\n.notification.is-info {\n  background-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.notification.is-info.is-light {\n  background-color: #eff5fb;\n  color: #296fa8;\n}\n.notification.is-success {\n  background-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.notification.is-success.is-light {\n  background-color: #effaf5;\n  color: #257953;\n}\n.notification.is-warning {\n  background-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.notification.is-warning.is-light {\n  background-color: #fffaeb;\n  color: #946c00;\n}\n.notification.is-danger {\n  background-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.notification.is-danger.is-light {\n  background-color: #feecf0;\n  color: #cc0f35;\n}\n\n.progress {\n  -moz-appearance: none;\n  -webkit-appearance: none;\n  border: none;\n  border-radius: 9999px;\n  display: block;\n  height: 1rem;\n  overflow: hidden;\n  padding: 0;\n  width: 100%;\n}\n.progress::-webkit-progress-bar {\n  background-color: hsl(0, 0%, 93%);\n}\n.progress::-webkit-progress-value {\n  background-color: #363636;\n}\n.progress::-moz-progress-bar {\n  background-color: #363636;\n}\n.progress::-ms-fill {\n  background-color: #363636;\n  border: none;\n}\n.progress.is-white::-webkit-progress-value {\n  background-color: hsl(0, 0%, 100%);\n}\n.progress.is-white::-moz-progress-bar {\n  background-color: hsl(0, 0%, 100%);\n}\n.progress.is-white::-ms-fill {\n  background-color: hsl(0, 0%, 100%);\n}\n.progress.is-white:indeterminate {\n  background-image: linear-gradient(to right, hsl(0, 0%, 100%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-black::-webkit-progress-value {\n  background-color: hsl(0, 0%, 4%);\n}\n.progress.is-black::-moz-progress-bar {\n  background-color: hsl(0, 0%, 4%);\n}\n.progress.is-black::-ms-fill {\n  background-color: hsl(0, 0%, 4%);\n}\n.progress.is-black:indeterminate {\n  background-image: linear-gradient(to right, hsl(0, 0%, 4%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-light::-webkit-progress-value {\n  background-color: hsl(0, 0%, 96%);\n}\n.progress.is-light::-moz-progress-bar {\n  background-color: hsl(0, 0%, 96%);\n}\n.progress.is-light::-ms-fill {\n  background-color: hsl(0, 0%, 96%);\n}\n.progress.is-light:indeterminate {\n  background-image: linear-gradient(to right, hsl(0, 0%, 96%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-dark::-webkit-progress-value {\n  background-color: #242424;\n}\n.progress.is-dark::-moz-progress-bar {\n  background-color: #242424;\n}\n.progress.is-dark::-ms-fill {\n  background-color: #242424;\n}\n.progress.is-dark:indeterminate {\n  background-image: linear-gradient(to right, #242424 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-primary::-webkit-progress-value {\n  background-color: #00d1b2;\n}\n.progress.is-primary::-moz-progress-bar {\n  background-color: #00d1b2;\n}\n.progress.is-primary::-ms-fill {\n  background-color: #00d1b2;\n}\n.progress.is-primary:indeterminate {\n  background-image: linear-gradient(to right, #00d1b2 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-link::-webkit-progress-value {\n  background-color: #3273dc;\n}\n.progress.is-link::-moz-progress-bar {\n  background-color: #3273dc;\n}\n.progress.is-link::-ms-fill {\n  background-color: #3273dc;\n}\n.progress.is-link:indeterminate {\n  background-image: linear-gradient(to right, #3273dc 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-info::-webkit-progress-value {\n  background-color: hsl(207, 61%, 53%);\n}\n.progress.is-info::-moz-progress-bar {\n  background-color: hsl(207, 61%, 53%);\n}\n.progress.is-info::-ms-fill {\n  background-color: hsl(207, 61%, 53%);\n}\n.progress.is-info:indeterminate {\n  background-image: linear-gradient(to right, hsl(207, 61%, 53%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-success::-webkit-progress-value {\n  background-color: hsl(153, 53%, 53%);\n}\n.progress.is-success::-moz-progress-bar {\n  background-color: hsl(153, 53%, 53%);\n}\n.progress.is-success::-ms-fill {\n  background-color: hsl(153, 53%, 53%);\n}\n.progress.is-success:indeterminate {\n  background-image: linear-gradient(to right, hsl(153, 53%, 53%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-warning::-webkit-progress-value {\n  background-color: hsl(44, 100%, 77%);\n}\n.progress.is-warning::-moz-progress-bar {\n  background-color: hsl(44, 100%, 77%);\n}\n.progress.is-warning::-ms-fill {\n  background-color: hsl(44, 100%, 77%);\n}\n.progress.is-warning:indeterminate {\n  background-image: linear-gradient(to right, hsl(44, 100%, 77%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress.is-danger::-webkit-progress-value {\n  background-color: hsl(348, 86%, 61%);\n}\n.progress.is-danger::-moz-progress-bar {\n  background-color: hsl(348, 86%, 61%);\n}\n.progress.is-danger::-ms-fill {\n  background-color: hsl(348, 86%, 61%);\n}\n.progress.is-danger:indeterminate {\n  background-image: linear-gradient(to right, hsl(348, 86%, 61%) 30%, hsl(0, 0%, 93%) 30%);\n}\n.progress:indeterminate {\n  animation-duration: 1.5s;\n  animation-iteration-count: infinite;\n  animation-name: moveIndeterminate;\n  animation-timing-function: linear;\n  background-color: hsl(0, 0%, 93%);\n  background-image: linear-gradient(to right, #363636 30%, hsl(0, 0%, 93%) 30%);\n  background-position: top left;\n  background-repeat: no-repeat;\n  background-size: 150% 150%;\n}\n.progress:indeterminate::-webkit-progress-bar {\n  background-color: transparent;\n}\n.progress:indeterminate::-moz-progress-bar {\n  background-color: transparent;\n}\n.progress:indeterminate::-ms-fill {\n  animation-name: none;\n}\n.progress.is-small {\n  height: 0.75rem;\n}\n.progress.is-medium {\n  height: 1.25rem;\n}\n.progress.is-large {\n  height: 1.5rem;\n}\n\n@keyframes moveIndeterminate {\n  from {\n    background-position: 200% 0;\n  }\n  to {\n    background-position: -200% 0;\n  }\n}\n.table {\n  background-color: hsl(0, 0%, 100%);\n  color: #242424;\n}\n.table td,\n.table th {\n  border: 1px solid hsl(0, 0%, 86%);\n  border-width: 0 0 1px;\n  padding: 0.5em 0.75em;\n  vertical-align: top;\n}\n.table td.is-white,\n.table th.is-white {\n  background-color: hsl(0, 0%, 100%);\n  border-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.table td.is-black,\n.table th.is-black {\n  background-color: hsl(0, 0%, 4%);\n  border-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.table td.is-light,\n.table th.is-light {\n  background-color: hsl(0, 0%, 96%);\n  border-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.table td.is-dark,\n.table th.is-dark {\n  background-color: #242424;\n  border-color: #242424;\n  color: #fff;\n}\n.table td.is-primary,\n.table th.is-primary {\n  background-color: #00d1b2;\n  border-color: #00d1b2;\n  color: #fff;\n}\n.table td.is-link,\n.table th.is-link {\n  background-color: #3273dc;\n  border-color: #3273dc;\n  color: #fff;\n}\n.table td.is-info,\n.table th.is-info {\n  background-color: hsl(207, 61%, 53%);\n  border-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.table td.is-success,\n.table th.is-success {\n  background-color: hsl(153, 53%, 53%);\n  border-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.table td.is-warning,\n.table th.is-warning {\n  background-color: hsl(44, 100%, 77%);\n  border-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.table td.is-danger,\n.table th.is-danger {\n  background-color: hsl(348, 86%, 61%);\n  border-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.table td.is-narrow,\n.table th.is-narrow {\n  white-space: nowrap;\n  width: 1%;\n}\n.table td.is-selected,\n.table th.is-selected {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.table td.is-selected a,\n.table td.is-selected strong,\n.table th.is-selected a,\n.table th.is-selected strong {\n  color: currentColor;\n}\n.table td.is-vcentered,\n.table th.is-vcentered {\n  vertical-align: middle;\n}\n.table th {\n  color: #242424;\n}\n.table th:not([align]) {\n  text-align: left;\n}\n.table tr.is-selected {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.table tr.is-selected a,\n.table tr.is-selected strong {\n  color: currentColor;\n}\n.table tr.is-selected td,\n.table tr.is-selected th {\n  border-color: #fff;\n  color: currentColor;\n}\n.table thead {\n  background-color: transparent;\n}\n.table thead td,\n.table thead th {\n  border-width: 0 0 2px;\n  color: #242424;\n}\n.table tfoot {\n  background-color: transparent;\n}\n.table tfoot td,\n.table tfoot th {\n  border-width: 2px 0 0;\n  color: #242424;\n}\n.table tbody {\n  background-color: transparent;\n}\n.table tbody tr:last-child td,\n.table tbody tr:last-child th {\n  border-bottom-width: 0;\n}\n.table.is-bordered td,\n.table.is-bordered th {\n  border-width: 1px;\n}\n.table.is-bordered tr:last-child td,\n.table.is-bordered tr:last-child th {\n  border-bottom-width: 1px;\n}\n.table.is-fullwidth {\n  width: 100%;\n}\n.table.is-hoverable tbody tr:not(.is-selected):hover {\n  background-color: hsl(0, 0%, 98%);\n}\n.table.is-hoverable.is-striped tbody tr:not(.is-selected):hover {\n  background-color: hsl(0, 0%, 98%);\n}\n.table.is-hoverable.is-striped tbody tr:not(.is-selected):hover:nth-child(even) {\n  background-color: hsl(0, 0%, 96%);\n}\n.table.is-narrow td,\n.table.is-narrow th {\n  padding: 0.25em 0.5em;\n}\n.table.is-striped tbody tr:not(.is-selected):nth-child(even) {\n  background-color: hsl(0, 0%, 98%);\n}\n\n.table-container {\n  -webkit-overflow-scrolling: touch;\n  overflow: auto;\n  overflow-y: hidden;\n  max-width: 100%;\n}\n\n.tags {\n  align-items: center;\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-start;\n}\n.tags .tag {\n  margin-bottom: 0.5rem;\n}\n.tags .tag:not(:last-child) {\n  margin-right: 0.5rem;\n}\n.tags:last-child {\n  margin-bottom: -0.5rem;\n}\n.tags:not(:last-child) {\n  margin-bottom: 1rem;\n}\n.tags.are-medium .tag:not(.is-normal):not(.is-large) {\n  font-size: 1rem;\n}\n.tags.are-large .tag:not(.is-normal):not(.is-medium) {\n  font-size: 1.25rem;\n}\n.tags.is-centered {\n  justify-content: center;\n}\n.tags.is-centered .tag {\n  margin-right: 0.25rem;\n  margin-left: 0.25rem;\n}\n.tags.is-right {\n  justify-content: flex-end;\n}\n.tags.is-right .tag:not(:first-child) {\n  margin-left: 0.5rem;\n}\n.tags.is-right .tag:not(:last-child) {\n  margin-right: 0;\n}\n.tags.has-addons .tag {\n  margin-right: 0;\n}\n.tags.has-addons .tag:not(:first-child) {\n  margin-left: 0;\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.tags.has-addons .tag:not(:last-child) {\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}\n\n.tag:not(body) {\n  align-items: center;\n  background-color: hsl(0, 0%, 96%);\n  border-radius: 4px;\n  color: #363636;\n  display: inline-flex;\n  font-size: 0.75rem;\n  height: 2em;\n  justify-content: center;\n  line-height: 1.5;\n  padding-left: 0.75em;\n  padding-right: 0.75em;\n  white-space: nowrap;\n}\n.tag:not(body) .delete {\n  margin-left: 0.25rem;\n  margin-right: -0.375rem;\n}\n.tag:not(body).is-white {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.tag:not(body).is-black {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.tag:not(body).is-light {\n  background-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.tag:not(body).is-dark {\n  background-color: #242424;\n  color: #fff;\n}\n.tag:not(body).is-primary {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.tag:not(body).is-primary.is-light {\n  background-color: #ebfffc;\n  color: #00947e;\n}\n.tag:not(body).is-link {\n  background-color: #3273dc;\n  color: #fff;\n}\n.tag:not(body).is-link.is-light {\n  background-color: #eef3fc;\n  color: #2160c4;\n}\n.tag:not(body).is-info {\n  background-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.tag:not(body).is-info.is-light {\n  background-color: #eff5fb;\n  color: #296fa8;\n}\n.tag:not(body).is-success {\n  background-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.tag:not(body).is-success.is-light {\n  background-color: #effaf5;\n  color: #257953;\n}\n.tag:not(body).is-warning {\n  background-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.tag:not(body).is-warning.is-light {\n  background-color: #fffaeb;\n  color: #946c00;\n}\n.tag:not(body).is-danger {\n  background-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.tag:not(body).is-danger.is-light {\n  background-color: #feecf0;\n  color: #cc0f35;\n}\n.tag:not(body).is-normal {\n  font-size: 0.75rem;\n}\n.tag:not(body).is-medium {\n  font-size: 1rem;\n}\n.tag:not(body).is-large {\n  font-size: 1.25rem;\n}\n.tag:not(body) .icon:first-child:not(:last-child) {\n  margin-left: -0.375em;\n  margin-right: 0.1875em;\n}\n.tag:not(body) .icon:last-child:not(:first-child) {\n  margin-left: 0.1875em;\n  margin-right: -0.375em;\n}\n.tag:not(body) .icon:first-child:last-child {\n  margin-left: -0.375em;\n  margin-right: -0.375em;\n}\n.tag:not(body).is-delete {\n  margin-left: 1px;\n  padding: 0;\n  position: relative;\n  width: 2em;\n}\n.tag:not(body).is-delete::before, .tag:not(body).is-delete::after {\n  background-color: currentColor;\n  content: \"\";\n  display: block;\n  left: 50%;\n  position: absolute;\n  top: 50%;\n  transform: translateX(-50%) translateY(-50%) rotate(45deg);\n  transform-origin: center center;\n}\n.tag:not(body).is-delete::before {\n  height: 1px;\n  width: 50%;\n}\n.tag:not(body).is-delete::after {\n  height: 50%;\n  width: 1px;\n}\n.tag:not(body).is-delete:hover, .tag:not(body).is-delete:focus {\n  background-color: #e8e8e8;\n}\n.tag:not(body).is-delete:active {\n  background-color: #dbdbdb;\n}\n.tag:not(body).is-rounded {\n  border-radius: 9999px;\n}\n\na.tag:hover {\n  text-decoration: underline;\n}\n\n.title,\n.subtitle {\n  word-break: break-word;\n}\n.title em,\n.title span,\n.subtitle em,\n.subtitle span {\n  font-weight: inherit;\n}\n.title sub,\n.subtitle sub {\n  font-size: 0.75em;\n}\n.title sup,\n.subtitle sup {\n  font-size: 0.75em;\n}\n.title .tag,\n.subtitle .tag {\n  vertical-align: middle;\n}\n\n.title {\n  color: #dbdbdb;\n  font-size: 2rem;\n  font-weight: 600;\n  line-height: 1.125;\n}\n.title strong {\n  color: inherit;\n  font-weight: inherit;\n}\n.title:not(.is-spaced) + .subtitle {\n  margin-top: -1.25rem;\n}\n.title.is-1 {\n  font-size: 3rem;\n}\n.title.is-2 {\n  font-size: 2.5rem;\n}\n.title.is-3 {\n  font-size: 2rem;\n}\n.title.is-4 {\n  font-size: 1.5rem;\n}\n.title.is-5 {\n  font-size: 1.25rem;\n}\n.title.is-6 {\n  font-size: 1rem;\n}\n.title.is-7 {\n  font-size: 0.75rem;\n}\n\n.subtitle {\n  color: #dbdbdb;\n  font-size: 1.25rem;\n  font-weight: 400;\n  line-height: 1.25;\n}\n.subtitle strong {\n  color: #242424;\n  font-weight: 600;\n}\n.subtitle:not(.is-spaced) + .title {\n  margin-top: -1.25rem;\n}\n.subtitle.is-1 {\n  font-size: 3rem;\n}\n.subtitle.is-2 {\n  font-size: 2.5rem;\n}\n.subtitle.is-3 {\n  font-size: 2rem;\n}\n.subtitle.is-4 {\n  font-size: 1.5rem;\n}\n.subtitle.is-5 {\n  font-size: 1.25rem;\n}\n.subtitle.is-6 {\n  font-size: 1rem;\n}\n.subtitle.is-7 {\n  font-size: 0.75rem;\n}\n\n.heading {\n  display: block;\n  font-size: 11px;\n  letter-spacing: 1px;\n  margin-bottom: 5px;\n  text-transform: uppercase;\n}\n\n.number {\n  align-items: center;\n  background-color: hsl(0, 0%, 96%);\n  border-radius: 9999px;\n  display: inline-flex;\n  font-size: 1.25rem;\n  height: 2em;\n  justify-content: center;\n  margin-right: 1.5rem;\n  min-width: 2.5em;\n  padding: 0.25rem 0.5rem;\n  text-align: center;\n  vertical-align: top;\n}\n\n/* Bulma Form */\n.select select, .textarea, .input {\n  background-color: hsl(0, 0%, 100%);\n  border-color: transparent;\n  border-radius: 4px;\n  color: #242424;\n}\n.select select::-moz-placeholder, .textarea::-moz-placeholder, .input::-moz-placeholder {\n  color: rgba(36, 36, 36, 0.3);\n}\n.select select::-webkit-input-placeholder, .textarea::-webkit-input-placeholder, .input::-webkit-input-placeholder {\n  color: rgba(36, 36, 36, 0.3);\n}\n.select select:-moz-placeholder, .textarea:-moz-placeholder, .input:-moz-placeholder {\n  color: rgba(36, 36, 36, 0.3);\n}\n.select select:-ms-input-placeholder, .textarea:-ms-input-placeholder, .input:-ms-input-placeholder {\n  color: rgba(36, 36, 36, 0.3);\n}\n.select select:hover, .textarea:hover, .input:hover, .select select.is-hovered, .is-hovered.textarea, .is-hovered.input {\n  border-color: #dbdbdb;\n}\n.select select:focus, .textarea:focus, .input:focus, .select select.is-focused, .is-focused.textarea, .is-focused.input, .select select:active, .textarea:active, .input:active, .select select.is-active, .is-active.textarea, .is-active.input {\n  border-color: #3273dc;\n  box-shadow: 0 0 0 0.125em rgba(50, 115, 220, 0.25);\n}\n.select select[disabled], [disabled].textarea, [disabled].input, fieldset[disabled] .select select, .select fieldset[disabled] select, fieldset[disabled] .textarea, fieldset[disabled] .input {\n  background-color: hsl(0, 0%, 96%);\n  border-color: hsl(0, 0%, 96%);\n  box-shadow: none;\n  color: hsl(0, 0%, 48%);\n}\n.select select[disabled]::-moz-placeholder, [disabled].textarea::-moz-placeholder, [disabled].input::-moz-placeholder, fieldset[disabled] .select select::-moz-placeholder, .select fieldset[disabled] select::-moz-placeholder, fieldset[disabled] .textarea::-moz-placeholder, fieldset[disabled] .input::-moz-placeholder {\n  color: rgba(122, 122, 122, 0.3);\n}\n.select select[disabled]::-webkit-input-placeholder, [disabled].textarea::-webkit-input-placeholder, [disabled].input::-webkit-input-placeholder, fieldset[disabled] .select select::-webkit-input-placeholder, .select fieldset[disabled] select::-webkit-input-placeholder, fieldset[disabled] .textarea::-webkit-input-placeholder, fieldset[disabled] .input::-webkit-input-placeholder {\n  color: rgba(122, 122, 122, 0.3);\n}\n.select select[disabled]:-moz-placeholder, [disabled].textarea:-moz-placeholder, [disabled].input:-moz-placeholder, fieldset[disabled] .select select:-moz-placeholder, .select fieldset[disabled] select:-moz-placeholder, fieldset[disabled] .textarea:-moz-placeholder, fieldset[disabled] .input:-moz-placeholder {\n  color: rgba(122, 122, 122, 0.3);\n}\n.select select[disabled]:-ms-input-placeholder, [disabled].textarea:-ms-input-placeholder, [disabled].input:-ms-input-placeholder, fieldset[disabled] .select select:-ms-input-placeholder, .select fieldset[disabled] select:-ms-input-placeholder, fieldset[disabled] .textarea:-ms-input-placeholder, fieldset[disabled] .input:-ms-input-placeholder {\n  color: rgba(122, 122, 122, 0.3);\n}\n\n.textarea, .input {\n  box-shadow: none;\n  max-width: 100%;\n  width: 100%;\n}\n[readonly].textarea, [readonly].input {\n  box-shadow: none;\n}\n.is-white.textarea, .is-white.input {\n  border-color: hsl(0, 0%, 100%);\n}\n.is-white.textarea:focus, .is-white.input:focus, .is-white.is-focused.textarea, .is-white.is-focused.input, .is-white.textarea:active, .is-white.input:active, .is-white.is-active.textarea, .is-white.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(255, 255, 255, 0.25);\n}\n.is-black.textarea, .is-black.input {\n  border-color: hsl(0, 0%, 4%);\n}\n.is-black.textarea:focus, .is-black.input:focus, .is-black.is-focused.textarea, .is-black.is-focused.input, .is-black.textarea:active, .is-black.input:active, .is-black.is-active.textarea, .is-black.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(10, 10, 10, 0.25);\n}\n.is-light.textarea, .is-light.input {\n  border-color: hsl(0, 0%, 96%);\n}\n.is-light.textarea:focus, .is-light.input:focus, .is-light.is-focused.textarea, .is-light.is-focused.input, .is-light.textarea:active, .is-light.input:active, .is-light.is-active.textarea, .is-light.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(245, 245, 245, 0.25);\n}\n.is-dark.textarea, .is-dark.input {\n  border-color: #242424;\n}\n.is-dark.textarea:focus, .is-dark.input:focus, .is-dark.is-focused.textarea, .is-dark.is-focused.input, .is-dark.textarea:active, .is-dark.input:active, .is-dark.is-active.textarea, .is-dark.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(36, 36, 36, 0.25);\n}\n.is-primary.textarea, .is-primary.input {\n  border-color: #00d1b2;\n}\n.is-primary.textarea:focus, .is-primary.input:focus, .is-primary.is-focused.textarea, .is-primary.is-focused.input, .is-primary.textarea:active, .is-primary.input:active, .is-primary.is-active.textarea, .is-primary.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(0, 209, 178, 0.25);\n}\n.is-link.textarea, .is-link.input {\n  border-color: #3273dc;\n}\n.is-link.textarea:focus, .is-link.input:focus, .is-link.is-focused.textarea, .is-link.is-focused.input, .is-link.textarea:active, .is-link.input:active, .is-link.is-active.textarea, .is-link.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(50, 115, 220, 0.25);\n}\n.is-info.textarea, .is-info.input {\n  border-color: hsl(207, 61%, 53%);\n}\n.is-info.textarea:focus, .is-info.input:focus, .is-info.is-focused.textarea, .is-info.is-focused.input, .is-info.textarea:active, .is-info.input:active, .is-info.is-active.textarea, .is-info.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(62, 142, 208, 0.25);\n}\n.is-success.textarea, .is-success.input {\n  border-color: hsl(153, 53%, 53%);\n}\n.is-success.textarea:focus, .is-success.input:focus, .is-success.is-focused.textarea, .is-success.is-focused.input, .is-success.textarea:active, .is-success.input:active, .is-success.is-active.textarea, .is-success.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(72, 199, 142, 0.25);\n}\n.is-warning.textarea, .is-warning.input {\n  border-color: hsl(44, 100%, 77%);\n}\n.is-warning.textarea:focus, .is-warning.input:focus, .is-warning.is-focused.textarea, .is-warning.is-focused.input, .is-warning.textarea:active, .is-warning.input:active, .is-warning.is-active.textarea, .is-warning.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(255, 224, 138, 0.25);\n}\n.is-danger.textarea, .is-danger.input {\n  border-color: hsl(348, 86%, 61%);\n}\n.is-danger.textarea:focus, .is-danger.input:focus, .is-danger.is-focused.textarea, .is-danger.is-focused.input, .is-danger.textarea:active, .is-danger.input:active, .is-danger.is-active.textarea, .is-danger.is-active.input {\n  box-shadow: 0 0 0 0.125em rgba(241, 70, 104, 0.25);\n}\n.is-small.textarea, .is-small.input {\n  border-radius: 2px;\n  font-size: 0.75rem;\n}\n.is-medium.textarea, .is-medium.input {\n  font-size: 1.25rem;\n}\n.is-large.textarea, .is-large.input {\n  font-size: 1.5rem;\n}\n.is-fullwidth.textarea, .is-fullwidth.input {\n  display: block;\n  width: 100%;\n}\n.is-inline.textarea, .is-inline.input {\n  display: inline;\n  width: auto;\n}\n\n.input.is-rounded {\n  border-radius: 9999px;\n  padding-left: calc(calc(0.75em - 2px) + 0.375em);\n  padding-right: calc(calc(0.75em - 2px) + 0.375em);\n}\n.input.is-static {\n  background-color: transparent;\n  border-color: transparent;\n  box-shadow: none;\n  padding-left: 0;\n  padding-right: 0;\n}\n\n.textarea {\n  display: block;\n  max-width: 100%;\n  min-width: 100%;\n  padding: calc(0.75em - 2px);\n  resize: vertical;\n}\n.textarea:not([rows]) {\n  max-height: 40em;\n  min-height: 8em;\n}\n.textarea[rows] {\n  height: initial;\n}\n.textarea.has-fixed-size {\n  resize: none;\n}\n\n.radio, .checkbox {\n  cursor: pointer;\n  display: inline-block;\n  line-height: 1.25;\n  position: relative;\n}\n.radio input, .checkbox input {\n  cursor: pointer;\n}\n.radio:hover, .checkbox:hover {\n  color: #242424;\n}\n[disabled].radio, [disabled].checkbox, fieldset[disabled] .radio, fieldset[disabled] .checkbox,\n.radio input[disabled],\n.checkbox input[disabled] {\n  color: hsl(0, 0%, 48%);\n  cursor: not-allowed;\n}\n\n.radio + .radio {\n  margin-left: 0.5em;\n}\n\n.select {\n  display: inline-block;\n  max-width: 100%;\n  position: relative;\n  vertical-align: top;\n}\n.select:not(.is-multiple) {\n  height: 2.5em;\n}\n.select:not(.is-multiple):not(.is-loading)::after {\n  border-color: #3273dc;\n  right: 1.125em;\n  z-index: 4;\n}\n.select.is-rounded select {\n  border-radius: 9999px;\n  padding-left: 1em;\n}\n.select select {\n  cursor: pointer;\n  display: block;\n  font-size: 1em;\n  max-width: 100%;\n  outline: none;\n}\n.select select::-ms-expand {\n  display: none;\n}\n.select select[disabled]:hover, fieldset[disabled] .select select:hover {\n  border-color: hsl(0, 0%, 96%);\n}\n.select select:not([multiple]) {\n  padding-right: 2.5em;\n}\n.select select[multiple] {\n  height: auto;\n  padding: 0;\n}\n.select select[multiple] option {\n  padding: 0.5em 1em;\n}\n.select:not(.is-multiple):not(.is-loading):hover::after {\n  border-color: #242424;\n}\n.select.is-white:not(:hover)::after {\n  border-color: hsl(0, 0%, 100%);\n}\n.select.is-white select {\n  border-color: hsl(0, 0%, 100%);\n}\n.select.is-white select:hover, .select.is-white select.is-hovered {\n  border-color: #f2f2f2;\n}\n.select.is-white select:focus, .select.is-white select.is-focused, .select.is-white select:active, .select.is-white select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(255, 255, 255, 0.25);\n}\n.select.is-black:not(:hover)::after {\n  border-color: hsl(0, 0%, 4%);\n}\n.select.is-black select {\n  border-color: hsl(0, 0%, 4%);\n}\n.select.is-black select:hover, .select.is-black select.is-hovered {\n  border-color: black;\n}\n.select.is-black select:focus, .select.is-black select.is-focused, .select.is-black select:active, .select.is-black select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(10, 10, 10, 0.25);\n}\n.select.is-light:not(:hover)::after {\n  border-color: hsl(0, 0%, 96%);\n}\n.select.is-light select {\n  border-color: hsl(0, 0%, 96%);\n}\n.select.is-light select:hover, .select.is-light select.is-hovered {\n  border-color: #e8e8e8;\n}\n.select.is-light select:focus, .select.is-light select.is-focused, .select.is-light select:active, .select.is-light select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(245, 245, 245, 0.25);\n}\n.select.is-dark:not(:hover)::after {\n  border-color: #242424;\n}\n.select.is-dark select {\n  border-color: #242424;\n}\n.select.is-dark select:hover, .select.is-dark select.is-hovered {\n  border-color: #171717;\n}\n.select.is-dark select:focus, .select.is-dark select.is-focused, .select.is-dark select:active, .select.is-dark select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(36, 36, 36, 0.25);\n}\n.select.is-primary:not(:hover)::after {\n  border-color: #00d1b2;\n}\n.select.is-primary select {\n  border-color: #00d1b2;\n}\n.select.is-primary select:hover, .select.is-primary select.is-hovered {\n  border-color: #00b89c;\n}\n.select.is-primary select:focus, .select.is-primary select.is-focused, .select.is-primary select:active, .select.is-primary select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(0, 209, 178, 0.25);\n}\n.select.is-link:not(:hover)::after {\n  border-color: #3273dc;\n}\n.select.is-link select {\n  border-color: #3273dc;\n}\n.select.is-link select:hover, .select.is-link select.is-hovered {\n  border-color: #2466d1;\n}\n.select.is-link select:focus, .select.is-link select.is-focused, .select.is-link select:active, .select.is-link select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(50, 115, 220, 0.25);\n}\n.select.is-info:not(:hover)::after {\n  border-color: hsl(207, 61%, 53%);\n}\n.select.is-info select {\n  border-color: hsl(207, 61%, 53%);\n}\n.select.is-info select:hover, .select.is-info select.is-hovered {\n  border-color: #3082c5;\n}\n.select.is-info select:focus, .select.is-info select.is-focused, .select.is-info select:active, .select.is-info select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(62, 142, 208, 0.25);\n}\n.select.is-success:not(:hover)::after {\n  border-color: hsl(153, 53%, 53%);\n}\n.select.is-success select {\n  border-color: hsl(153, 53%, 53%);\n}\n.select.is-success select:hover, .select.is-success select.is-hovered {\n  border-color: #3abb81;\n}\n.select.is-success select:focus, .select.is-success select.is-focused, .select.is-success select:active, .select.is-success select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(72, 199, 142, 0.25);\n}\n.select.is-warning:not(:hover)::after {\n  border-color: hsl(44, 100%, 77%);\n}\n.select.is-warning select {\n  border-color: hsl(44, 100%, 77%);\n}\n.select.is-warning select:hover, .select.is-warning select.is-hovered {\n  border-color: #ffd970;\n}\n.select.is-warning select:focus, .select.is-warning select.is-focused, .select.is-warning select:active, .select.is-warning select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(255, 224, 138, 0.25);\n}\n.select.is-danger:not(:hover)::after {\n  border-color: hsl(348, 86%, 61%);\n}\n.select.is-danger select {\n  border-color: hsl(348, 86%, 61%);\n}\n.select.is-danger select:hover, .select.is-danger select.is-hovered {\n  border-color: #ef2e55;\n}\n.select.is-danger select:focus, .select.is-danger select.is-focused, .select.is-danger select:active, .select.is-danger select.is-active {\n  box-shadow: 0 0 0 0.125em rgba(241, 70, 104, 0.25);\n}\n.select.is-small {\n  border-radius: 2px;\n  font-size: 0.75rem;\n}\n.select.is-medium {\n  font-size: 1.25rem;\n}\n.select.is-large {\n  font-size: 1.5rem;\n}\n.select.is-disabled::after {\n  border-color: hsl(0, 0%, 48%) !important;\n  opacity: 0.5;\n}\n.select.is-fullwidth {\n  width: 100%;\n}\n.select.is-fullwidth select {\n  width: 100%;\n}\n.select.is-loading::after {\n  margin-top: 0;\n  position: absolute;\n  right: 0.625em;\n  top: 0.625em;\n  transform: none;\n}\n.select.is-loading.is-small:after {\n  font-size: 0.75rem;\n}\n.select.is-loading.is-medium:after {\n  font-size: 1.25rem;\n}\n.select.is-loading.is-large:after {\n  font-size: 1.5rem;\n}\n\n.file {\n  align-items: stretch;\n  display: flex;\n  justify-content: flex-start;\n  position: relative;\n}\n.file.is-white .file-cta {\n  background-color: hsl(0, 0%, 100%);\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.file.is-white:hover .file-cta, .file.is-white.is-hovered .file-cta {\n  background-color: #f9f9f9;\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.file.is-white:focus .file-cta, .file.is-white.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(255, 255, 255, 0.25);\n  color: hsl(0, 0%, 4%);\n}\n.file.is-white:active .file-cta, .file.is-white.is-active .file-cta {\n  background-color: #f2f2f2;\n  border-color: transparent;\n  color: hsl(0, 0%, 4%);\n}\n.file.is-black .file-cta {\n  background-color: hsl(0, 0%, 4%);\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.file.is-black:hover .file-cta, .file.is-black.is-hovered .file-cta {\n  background-color: #040404;\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.file.is-black:focus .file-cta, .file.is-black.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(10, 10, 10, 0.25);\n  color: hsl(0, 0%, 100%);\n}\n.file.is-black:active .file-cta, .file.is-black.is-active .file-cta {\n  background-color: black;\n  border-color: transparent;\n  color: hsl(0, 0%, 100%);\n}\n.file.is-light .file-cta {\n  background-color: hsl(0, 0%, 96%);\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-light:hover .file-cta, .file.is-light.is-hovered .file-cta {\n  background-color: #eeeeee;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-light:focus .file-cta, .file.is-light.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(245, 245, 245, 0.25);\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-light:active .file-cta, .file.is-light.is-active .file-cta {\n  background-color: #e8e8e8;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-dark .file-cta {\n  background-color: #242424;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-dark:hover .file-cta, .file.is-dark.is-hovered .file-cta {\n  background-color: #1e1e1e;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-dark:focus .file-cta, .file.is-dark.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(36, 36, 36, 0.25);\n  color: #fff;\n}\n.file.is-dark:active .file-cta, .file.is-dark.is-active .file-cta {\n  background-color: #171717;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-primary .file-cta {\n  background-color: #00d1b2;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-primary:hover .file-cta, .file.is-primary.is-hovered .file-cta {\n  background-color: #00c4a7;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-primary:focus .file-cta, .file.is-primary.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(0, 209, 178, 0.25);\n  color: #fff;\n}\n.file.is-primary:active .file-cta, .file.is-primary.is-active .file-cta {\n  background-color: #00b89c;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-link .file-cta {\n  background-color: #3273dc;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-link:hover .file-cta, .file.is-link.is-hovered .file-cta {\n  background-color: #276cda;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-link:focus .file-cta, .file.is-link.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(50, 115, 220, 0.25);\n  color: #fff;\n}\n.file.is-link:active .file-cta, .file.is-link.is-active .file-cta {\n  background-color: #2466d1;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-info .file-cta {\n  background-color: hsl(207, 61%, 53%);\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-info:hover .file-cta, .file.is-info.is-hovered .file-cta {\n  background-color: #3488ce;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-info:focus .file-cta, .file.is-info.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(62, 142, 208, 0.25);\n  color: #fff;\n}\n.file.is-info:active .file-cta, .file.is-info.is-active .file-cta {\n  background-color: #3082c5;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-success .file-cta {\n  background-color: hsl(153, 53%, 53%);\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-success:hover .file-cta, .file.is-success.is-hovered .file-cta {\n  background-color: #3ec487;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-success:focus .file-cta, .file.is-success.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(72, 199, 142, 0.25);\n  color: #fff;\n}\n.file.is-success:active .file-cta, .file.is-success.is-active .file-cta {\n  background-color: #3abb81;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-warning .file-cta {\n  background-color: hsl(44, 100%, 77%);\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-warning:hover .file-cta, .file.is-warning.is-hovered .file-cta {\n  background-color: #ffdc7d;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-warning:focus .file-cta, .file.is-warning.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(255, 224, 138, 0.25);\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-warning:active .file-cta, .file.is-warning.is-active .file-cta {\n  background-color: #ffd970;\n  border-color: transparent;\n  color: rgba(0, 0, 0, 0.7);\n}\n.file.is-danger .file-cta {\n  background-color: hsl(348, 86%, 61%);\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-danger:hover .file-cta, .file.is-danger.is-hovered .file-cta {\n  background-color: #f03a5f;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-danger:focus .file-cta, .file.is-danger.is-focused .file-cta {\n  border-color: transparent;\n  box-shadow: 0 0 0.5em rgba(241, 70, 104, 0.25);\n  color: #fff;\n}\n.file.is-danger:active .file-cta, .file.is-danger.is-active .file-cta {\n  background-color: #ef2e55;\n  border-color: transparent;\n  color: #fff;\n}\n.file.is-small {\n  font-size: 0.75rem;\n}\n.file.is-normal {\n  font-size: 1rem;\n}\n.file.is-medium {\n  font-size: 1.25rem;\n}\n.file.is-medium .file-icon .fa {\n  font-size: 21px;\n}\n.file.is-large {\n  font-size: 1.5rem;\n}\n.file.is-large .file-icon .fa {\n  font-size: 28px;\n}\n.file.has-name .file-cta {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.file.has-name .file-name {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.file.has-name.is-empty .file-cta {\n  border-radius: 4px;\n}\n.file.has-name.is-empty .file-name {\n  display: none;\n}\n.file.is-boxed .file-label {\n  flex-direction: column;\n}\n.file.is-boxed .file-cta {\n  flex-direction: column;\n  height: auto;\n  padding: 1em 3em;\n}\n.file.is-boxed .file-name {\n  border-width: 0 1px 1px;\n}\n.file.is-boxed .file-icon {\n  height: 1.5em;\n  width: 1.5em;\n}\n.file.is-boxed .file-icon .fa {\n  font-size: 21px;\n}\n.file.is-boxed.is-small .file-icon .fa {\n  font-size: 14px;\n}\n.file.is-boxed.is-medium .file-icon .fa {\n  font-size: 28px;\n}\n.file.is-boxed.is-large .file-icon .fa {\n  font-size: 35px;\n}\n.file.is-boxed.has-name .file-cta {\n  border-radius: 4px 4px 0 0;\n}\n.file.is-boxed.has-name .file-name {\n  border-radius: 0 0 4px 4px;\n  border-width: 0 1px 1px;\n}\n.file.is-centered {\n  justify-content: center;\n}\n.file.is-fullwidth .file-label {\n  width: 100%;\n}\n.file.is-fullwidth .file-name {\n  flex-grow: 1;\n  max-width: none;\n}\n.file.is-right {\n  justify-content: flex-end;\n}\n.file.is-right .file-cta {\n  border-radius: 0 4px 4px 0;\n}\n.file.is-right .file-name {\n  border-radius: 4px 0 0 4px;\n  border-width: 1px 0 1px 1px;\n  order: -1;\n}\n\n.file-label {\n  align-items: stretch;\n  display: flex;\n  cursor: pointer;\n  justify-content: flex-start;\n  overflow: hidden;\n  position: relative;\n}\n.file-label:hover .file-cta {\n  background-color: #eeeeee;\n  color: #242424;\n}\n.file-label:hover .file-name {\n  border-color: #d5d5d5;\n}\n.file-label:active .file-cta {\n  background-color: #e8e8e8;\n  color: #242424;\n}\n.file-label:active .file-name {\n  border-color: #cfcfcf;\n}\n\n.file-input {\n  height: 100%;\n  left: 0;\n  opacity: 0;\n  outline: none;\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n\n.file-cta,\n.file-name {\n  border-color: hsl(0, 0%, 86%);\n  border-radius: 4px;\n  font-size: 1em;\n  padding-left: 1em;\n  padding-right: 1em;\n  white-space: nowrap;\n}\n\n.file-cta {\n  background-color: hsl(0, 0%, 96%);\n  color: #363636;\n}\n\n.file-name {\n  border-color: hsl(0, 0%, 86%);\n  border-style: solid;\n  border-width: 1px 1px 1px 0;\n  display: block;\n  max-width: 16em;\n  overflow: hidden;\n  text-align: inherit;\n  text-overflow: ellipsis;\n}\n\n.file-icon {\n  align-items: center;\n  display: flex;\n  height: 1em;\n  justify-content: center;\n  margin-right: 0.5em;\n  width: 1em;\n}\n.file-icon .fa {\n  font-size: 14px;\n}\n\n.label {\n  color: #242424;\n  display: block;\n  font-size: 1rem;\n  font-weight: 700;\n}\n.label:not(:last-child) {\n  margin-bottom: 0.5em;\n}\n.label.is-small {\n  font-size: 0.75rem;\n}\n.label.is-medium {\n  font-size: 1.25rem;\n}\n.label.is-large {\n  font-size: 1.5rem;\n}\n\n.help {\n  display: block;\n  font-size: 0.75rem;\n  margin-top: 0.25rem;\n}\n.help.is-white {\n  color: hsl(0, 0%, 100%);\n}\n.help.is-black {\n  color: hsl(0, 0%, 4%);\n}\n.help.is-light {\n  color: hsl(0, 0%, 96%);\n}\n.help.is-dark {\n  color: #242424;\n}\n.help.is-primary {\n  color: #00d1b2;\n}\n.help.is-link {\n  color: #3273dc;\n}\n.help.is-info {\n  color: hsl(207, 61%, 53%);\n}\n.help.is-success {\n  color: hsl(153, 53%, 53%);\n}\n.help.is-warning {\n  color: hsl(44, 100%, 77%);\n}\n.help.is-danger {\n  color: hsl(348, 86%, 61%);\n}\n\n.field:not(:last-child) {\n  margin-bottom: 0.75rem;\n}\n.field.has-addons {\n  display: flex;\n  justify-content: flex-start;\n}\n.field.has-addons .control:not(:last-child) {\n  margin-right: -1px;\n}\n.field.has-addons .control:not(:first-child):not(:last-child) .button,\n.field.has-addons .control:not(:first-child):not(:last-child) .input,\n.field.has-addons .control:not(:first-child):not(:last-child) .select select {\n  border-radius: 0;\n}\n.field.has-addons .control:first-child:not(:only-child) .button,\n.field.has-addons .control:first-child:not(:only-child) .input,\n.field.has-addons .control:first-child:not(:only-child) .select select {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.field.has-addons .control:last-child:not(:only-child) .button,\n.field.has-addons .control:last-child:not(:only-child) .input,\n.field.has-addons .control:last-child:not(:only-child) .select select {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.field.has-addons .control .button:not([disabled]):hover, .field.has-addons .control .button:not([disabled]).is-hovered,\n.field.has-addons .control .input:not([disabled]):hover,\n.field.has-addons .control .input:not([disabled]).is-hovered,\n.field.has-addons .control .select select:not([disabled]):hover,\n.field.has-addons .control .select select:not([disabled]).is-hovered {\n  z-index: 2;\n}\n.field.has-addons .control .button:not([disabled]):focus, .field.has-addons .control .button:not([disabled]).is-focused, .field.has-addons .control .button:not([disabled]):active, .field.has-addons .control .button:not([disabled]).is-active,\n.field.has-addons .control .input:not([disabled]):focus,\n.field.has-addons .control .input:not([disabled]).is-focused,\n.field.has-addons .control .input:not([disabled]):active,\n.field.has-addons .control .input:not([disabled]).is-active,\n.field.has-addons .control .select select:not([disabled]):focus,\n.field.has-addons .control .select select:not([disabled]).is-focused,\n.field.has-addons .control .select select:not([disabled]):active,\n.field.has-addons .control .select select:not([disabled]).is-active {\n  z-index: 3;\n}\n.field.has-addons .control .button:not([disabled]):focus:hover, .field.has-addons .control .button:not([disabled]).is-focused:hover, .field.has-addons .control .button:not([disabled]):active:hover, .field.has-addons .control .button:not([disabled]).is-active:hover,\n.field.has-addons .control .input:not([disabled]):focus:hover,\n.field.has-addons .control .input:not([disabled]).is-focused:hover,\n.field.has-addons .control .input:not([disabled]):active:hover,\n.field.has-addons .control .input:not([disabled]).is-active:hover,\n.field.has-addons .control .select select:not([disabled]):focus:hover,\n.field.has-addons .control .select select:not([disabled]).is-focused:hover,\n.field.has-addons .control .select select:not([disabled]):active:hover,\n.field.has-addons .control .select select:not([disabled]).is-active:hover {\n  z-index: 4;\n}\n.field.has-addons .control.is-expanded {\n  flex-grow: 1;\n  flex-shrink: 1;\n}\n.field.has-addons.has-addons-centered {\n  justify-content: center;\n}\n.field.has-addons.has-addons-right {\n  justify-content: flex-end;\n}\n.field.has-addons.has-addons-fullwidth .control {\n  flex-grow: 1;\n  flex-shrink: 0;\n}\n.field.is-grouped {\n  display: flex;\n  justify-content: flex-start;\n}\n.field.is-grouped > .control {\n  flex-shrink: 0;\n}\n.field.is-grouped > .control:not(:last-child) {\n  margin-bottom: 0;\n  margin-right: 0.75rem;\n}\n.field.is-grouped > .control.is-expanded {\n  flex-grow: 1;\n  flex-shrink: 1;\n}\n.field.is-grouped.is-grouped-centered {\n  justify-content: center;\n}\n.field.is-grouped.is-grouped-right {\n  justify-content: flex-end;\n}\n.field.is-grouped.is-grouped-multiline {\n  flex-wrap: wrap;\n}\n.field.is-grouped.is-grouped-multiline > .control:last-child, .field.is-grouped.is-grouped-multiline > .control:not(:last-child) {\n  margin-bottom: 0.75rem;\n}\n.field.is-grouped.is-grouped-multiline:last-child {\n  margin-bottom: -0.75rem;\n}\n.field.is-grouped.is-grouped-multiline:not(:last-child) {\n  margin-bottom: 0;\n}\n@media screen and (min-width: 769px), print {\n  .field.is-horizontal {\n    display: flex;\n  }\n}\n\n.field-label .label {\n  font-size: inherit;\n}\n@media screen and (max-width: 768px) {\n  .field-label {\n    margin-bottom: 0.5rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .field-label {\n    flex-basis: 0;\n    flex-grow: 1;\n    flex-shrink: 0;\n    margin-right: 1.5rem;\n    text-align: right;\n  }\n  .field-label.is-small {\n    font-size: 0.75rem;\n    padding-top: 0.375em;\n  }\n  .field-label.is-normal {\n    padding-top: 0.375em;\n  }\n  .field-label.is-medium {\n    font-size: 1.25rem;\n    padding-top: 0.375em;\n  }\n  .field-label.is-large {\n    font-size: 1.5rem;\n    padding-top: 0.375em;\n  }\n}\n\n.field-body .field .field {\n  margin-bottom: 0;\n}\n@media screen and (min-width: 769px), print {\n  .field-body {\n    display: flex;\n    flex-basis: 0;\n    flex-grow: 5;\n    flex-shrink: 1;\n  }\n  .field-body .field {\n    margin-bottom: 0;\n  }\n  .field-body > .field {\n    flex-shrink: 1;\n  }\n  .field-body > .field:not(.is-narrow) {\n    flex-grow: 1;\n  }\n  .field-body > .field:not(:last-child) {\n    margin-right: 0.75rem;\n  }\n}\n\n.control {\n  box-sizing: border-box;\n  clear: both;\n  font-size: 1rem;\n  position: relative;\n  text-align: inherit;\n}\n.control.has-icons-left .input:focus ~ .icon,\n.control.has-icons-left .select:focus ~ .icon, .control.has-icons-right .input:focus ~ .icon,\n.control.has-icons-right .select:focus ~ .icon {\n  color: #363636;\n}\n.control.has-icons-left .input.is-small ~ .icon,\n.control.has-icons-left .select.is-small ~ .icon, .control.has-icons-right .input.is-small ~ .icon,\n.control.has-icons-right .select.is-small ~ .icon {\n  font-size: 0.75rem;\n}\n.control.has-icons-left .input.is-medium ~ .icon,\n.control.has-icons-left .select.is-medium ~ .icon, .control.has-icons-right .input.is-medium ~ .icon,\n.control.has-icons-right .select.is-medium ~ .icon {\n  font-size: 1.25rem;\n}\n.control.has-icons-left .input.is-large ~ .icon,\n.control.has-icons-left .select.is-large ~ .icon, .control.has-icons-right .input.is-large ~ .icon,\n.control.has-icons-right .select.is-large ~ .icon {\n  font-size: 1.5rem;\n}\n.control.has-icons-left .icon, .control.has-icons-right .icon {\n  color: hsl(0, 0%, 86%);\n  height: 2.5em;\n  pointer-events: none;\n  position: absolute;\n  top: 0;\n  width: 2.5em;\n  z-index: 4;\n}\n.control.has-icons-left .input,\n.control.has-icons-left .select select {\n  padding-left: 2.5em;\n}\n.control.has-icons-left .icon.is-left {\n  left: 0;\n}\n.control.has-icons-right .input,\n.control.has-icons-right .select select {\n  padding-right: 2.5em;\n}\n.control.has-icons-right .icon.is-right {\n  right: 0;\n}\n.control.is-loading::after {\n  position: absolute !important;\n  right: 0.625em;\n  top: 0.625em;\n  z-index: 4;\n}\n.control.is-loading.is-small:after {\n  font-size: 0.75rem;\n}\n.control.is-loading.is-medium:after {\n  font-size: 1.25rem;\n}\n.control.is-loading.is-large:after {\n  font-size: 1.5rem;\n}\n\n/* Bulma Components */\n.breadcrumb {\n  font-size: 1rem;\n  white-space: nowrap;\n}\n.breadcrumb a {\n  align-items: center;\n  color: #3273dc;\n  display: flex;\n  justify-content: center;\n  padding: 0 0.75em;\n}\n.breadcrumb a:hover {\n  color: #242424;\n}\n.breadcrumb li {\n  align-items: center;\n  display: flex;\n}\n.breadcrumb li:first-child a {\n  padding-left: 0;\n}\n.breadcrumb li.is-active a {\n  color: #242424;\n  cursor: default;\n  pointer-events: none;\n}\n.breadcrumb li + li::before {\n  color: #dbdbdb;\n  content: \"/\";\n}\n.breadcrumb ul,\n.breadcrumb ol {\n  align-items: flex-start;\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-start;\n}\n.breadcrumb .icon:first-child {\n  margin-right: 0.5em;\n}\n.breadcrumb .icon:last-child {\n  margin-left: 0.5em;\n}\n.breadcrumb.is-centered ol,\n.breadcrumb.is-centered ul {\n  justify-content: center;\n}\n.breadcrumb.is-right ol,\n.breadcrumb.is-right ul {\n  justify-content: flex-end;\n}\n.breadcrumb.is-small {\n  font-size: 0.75rem;\n}\n.breadcrumb.is-medium {\n  font-size: 1.25rem;\n}\n.breadcrumb.is-large {\n  font-size: 1.5rem;\n}\n.breadcrumb.has-arrow-separator li + li::before {\n  content: \"→\";\n}\n.breadcrumb.has-bullet-separator li + li::before {\n  content: \"•\";\n}\n.breadcrumb.has-dot-separator li + li::before {\n  content: \"·\";\n}\n.breadcrumb.has-succeeds-separator li + li::before {\n  content: \"≻\";\n}\n\n.card {\n  background-color: hsl(0, 0%, 100%);\n  border-radius: 0.25rem;\n  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);\n  color: #363636;\n  max-width: 100%;\n  position: relative;\n}\n\n.card-footer:first-child, .card-content:first-child, .card-header:first-child {\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.card-footer:last-child, .card-content:last-child, .card-header:last-child {\n  border-bottom-left-radius: 0.25rem;\n  border-bottom-right-radius: 0.25rem;\n}\n\n.card-header {\n  background-color: transparent;\n  align-items: stretch;\n  box-shadow: 0 0.125em 0.25em rgba(10, 10, 10, 0.1);\n  display: flex;\n}\n\n.card-header-title {\n  align-items: center;\n  color: #242424;\n  display: flex;\n  flex-grow: 1;\n  font-weight: 700;\n  padding: 0.75rem 1rem;\n}\n.card-header-title.is-centered {\n  justify-content: center;\n}\n\n.card-header-icon {\n  -moz-appearance: none;\n  -webkit-appearance: none;\n  appearance: none;\n  background: none;\n  border: none;\n  color: currentColor;\n  font-family: inherit;\n  font-size: 1em;\n  margin: 0;\n  padding: 0;\n  align-items: center;\n  cursor: pointer;\n  display: flex;\n  justify-content: center;\n  padding: 0.75rem 1rem;\n}\n\n.card-image {\n  display: block;\n  position: relative;\n}\n.card-image:first-child img {\n  border-top-left-radius: 0.25rem;\n  border-top-right-radius: 0.25rem;\n}\n.card-image:last-child img {\n  border-bottom-left-radius: 0.25rem;\n  border-bottom-right-radius: 0.25rem;\n}\n\n.card-content {\n  background-color: transparent;\n  padding: 1.5rem;\n}\n\n.card-footer {\n  background-color: transparent;\n  border-top: 1px solid hsl(0, 0%, 93%);\n  align-items: stretch;\n  display: flex;\n}\n\n.card-footer-item {\n  align-items: center;\n  display: flex;\n  flex-basis: 0;\n  flex-grow: 1;\n  flex-shrink: 0;\n  justify-content: center;\n  padding: 0.75rem;\n}\n.card-footer-item:not(:last-child) {\n  border-right: 1px solid hsl(0, 0%, 93%);\n}\n\n.card .media:not(:last-child) {\n  margin-bottom: 1.5rem;\n}\n\n.dropdown {\n  display: inline-flex;\n  position: relative;\n  vertical-align: top;\n}\n.dropdown.is-active .dropdown-menu, .dropdown.is-hoverable:hover .dropdown-menu {\n  display: block;\n}\n.dropdown.is-right .dropdown-menu {\n  left: auto;\n  right: 0;\n}\n.dropdown.is-up .dropdown-menu {\n  bottom: 100%;\n  padding-bottom: 4px;\n  padding-top: initial;\n  top: auto;\n}\n\n.dropdown-menu {\n  display: none;\n  left: 0;\n  min-width: 12rem;\n  padding-top: 4px;\n  position: absolute;\n  top: 100%;\n  z-index: 20;\n}\n\n.dropdown-content {\n  background-color: hsl(0, 0%, 100%);\n  border-radius: 4px;\n  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);\n  padding-bottom: 0.5rem;\n  padding-top: 0.5rem;\n}\n\n.dropdown-item {\n  color: #363636;\n  display: block;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  padding: 0.375rem 1rem;\n  position: relative;\n}\n\na.dropdown-item,\nbutton.dropdown-item {\n  padding-right: 3rem;\n  text-align: inherit;\n  white-space: nowrap;\n  width: 100%;\n}\na.dropdown-item:hover,\nbutton.dropdown-item:hover {\n  background-color: hsl(0, 0%, 96%);\n  color: hsl(0, 0%, 4%);\n}\na.dropdown-item.is-active,\nbutton.dropdown-item.is-active {\n  background-color: #3273dc;\n  color: #fff;\n}\n\n.dropdown-divider {\n  background-color: hsl(0, 0%, 93%);\n  border: none;\n  display: block;\n  height: 1px;\n  margin: 0.5rem 0;\n}\n\n.level {\n  align-items: center;\n  justify-content: space-between;\n}\n.level code {\n  border-radius: 4px;\n}\n.level img {\n  display: inline-block;\n  vertical-align: top;\n}\n.level.is-mobile {\n  display: flex;\n}\n.level.is-mobile .level-left,\n.level.is-mobile .level-right {\n  display: flex;\n}\n.level.is-mobile .level-left + .level-right {\n  margin-top: 0;\n}\n.level.is-mobile .level-item:not(:last-child) {\n  margin-bottom: 0;\n  margin-right: 0.75rem;\n}\n.level.is-mobile .level-item:not(.is-narrow) {\n  flex-grow: 1;\n}\n@media screen and (min-width: 769px), print {\n  .level {\n    display: flex;\n  }\n  .level > .level-item:not(.is-narrow) {\n    flex-grow: 1;\n  }\n}\n\n.level-item {\n  align-items: center;\n  display: flex;\n  flex-basis: auto;\n  flex-grow: 0;\n  flex-shrink: 0;\n  justify-content: center;\n}\n.level-item .title,\n.level-item .subtitle {\n  margin-bottom: 0;\n}\n@media screen and (max-width: 768px) {\n  .level-item:not(:last-child) {\n    margin-bottom: 0.75rem;\n  }\n}\n\n.level-left,\n.level-right {\n  flex-basis: auto;\n  flex-grow: 0;\n  flex-shrink: 0;\n}\n.level-left .level-item.is-flexible,\n.level-right .level-item.is-flexible {\n  flex-grow: 1;\n}\n@media screen and (min-width: 769px), print {\n  .level-left .level-item:not(:last-child),\n  .level-right .level-item:not(:last-child) {\n    margin-right: 0.75rem;\n  }\n}\n\n.level-left {\n  align-items: center;\n  justify-content: flex-start;\n}\n@media screen and (max-width: 768px) {\n  .level-left + .level-right {\n    margin-top: 1.5rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .level-left {\n    display: flex;\n  }\n}\n\n.level-right {\n  align-items: center;\n  justify-content: flex-end;\n}\n@media screen and (min-width: 769px), print {\n  .level-right {\n    display: flex;\n  }\n}\n\n.media {\n  align-items: flex-start;\n  display: flex;\n  text-align: inherit;\n}\n.media .content:not(:last-child) {\n  margin-bottom: 0.75rem;\n}\n.media .media {\n  border-top: 1px solid rgba(219, 219, 219, 0.5);\n  display: flex;\n  padding-top: 0.75rem;\n}\n.media .media .content:not(:last-child),\n.media .media .control:not(:last-child) {\n  margin-bottom: 0.5rem;\n}\n.media .media .media {\n  padding-top: 0.5rem;\n}\n.media .media .media + .media {\n  margin-top: 0.5rem;\n}\n.media + .media {\n  border-top: 1px solid rgba(219, 219, 219, 0.5);\n  margin-top: 1rem;\n  padding-top: 1rem;\n}\n.media.is-large + .media {\n  margin-top: 1.5rem;\n  padding-top: 1.5rem;\n}\n\n.media-left,\n.media-right {\n  flex-basis: auto;\n  flex-grow: 0;\n  flex-shrink: 0;\n}\n\n.media-left {\n  margin-right: 1rem;\n}\n\n.media-right {\n  margin-left: 1rem;\n}\n\n.media-content {\n  flex-basis: auto;\n  flex-grow: 1;\n  flex-shrink: 1;\n  text-align: inherit;\n}\n\n@media screen and (max-width: 768px) {\n  .media-content {\n    overflow-x: auto;\n  }\n}\n.menu {\n  font-size: 1rem;\n}\n.menu.is-small {\n  font-size: 0.75rem;\n}\n.menu.is-medium {\n  font-size: 1.25rem;\n}\n.menu.is-large {\n  font-size: 1.5rem;\n}\n\n.menu-list {\n  line-height: 1.25;\n}\n.menu-list a {\n  border-radius: 2px;\n  color: #363636;\n  display: block;\n  padding: 0.5em 0.75em;\n}\n.menu-list a:hover {\n  background-color: hsl(0, 0%, 96%);\n  color: #242424;\n}\n.menu-list a.is-active {\n  background-color: #3273dc;\n  color: #fff;\n}\n.menu-list li ul {\n  border-left: 1px solid hsl(0, 0%, 86%);\n  margin: 0.75em;\n  padding-left: 0.75em;\n}\n\n.menu-label {\n  color: hsl(0, 0%, 48%);\n  font-size: 0.75em;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n}\n.menu-label:not(:first-child) {\n  margin-top: 1em;\n}\n.menu-label:not(:last-child) {\n  margin-bottom: 1em;\n}\n\n.message {\n  background-color: hsl(0, 0%, 96%);\n  border-radius: 4px;\n  font-size: 1rem;\n}\n.message strong {\n  color: currentColor;\n}\n.message a:not(.button):not(.tag):not(.dropdown-item) {\n  color: currentColor;\n  text-decoration: underline;\n}\n.message.is-small {\n  font-size: 0.75rem;\n}\n.message.is-medium {\n  font-size: 1.25rem;\n}\n.message.is-large {\n  font-size: 1.5rem;\n}\n.message.is-white {\n  background-color: white;\n}\n.message.is-white .message-header {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.message.is-white .message-body {\n  border-color: hsl(0, 0%, 100%);\n}\n.message.is-black {\n  background-color: #fafafa;\n}\n.message.is-black .message-header {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.message.is-black .message-body {\n  border-color: hsl(0, 0%, 4%);\n}\n.message.is-light {\n  background-color: #fafafa;\n}\n.message.is-light .message-header {\n  background-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.message.is-light .message-body {\n  border-color: hsl(0, 0%, 96%);\n}\n.message.is-dark {\n  background-color: #fafafa;\n}\n.message.is-dark .message-header {\n  background-color: #242424;\n  color: #fff;\n}\n.message.is-dark .message-body {\n  border-color: #242424;\n}\n.message.is-primary {\n  background-color: #ebfffc;\n}\n.message.is-primary .message-header {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.message.is-primary .message-body {\n  border-color: #00d1b2;\n  color: #00947e;\n}\n.message.is-link {\n  background-color: #eef3fc;\n}\n.message.is-link .message-header {\n  background-color: #3273dc;\n  color: #fff;\n}\n.message.is-link .message-body {\n  border-color: #3273dc;\n  color: #2160c4;\n}\n.message.is-info {\n  background-color: #eff5fb;\n}\n.message.is-info .message-header {\n  background-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.message.is-info .message-body {\n  border-color: hsl(207, 61%, 53%);\n  color: #296fa8;\n}\n.message.is-success {\n  background-color: #effaf5;\n}\n.message.is-success .message-header {\n  background-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.message.is-success .message-body {\n  border-color: hsl(153, 53%, 53%);\n  color: #257953;\n}\n.message.is-warning {\n  background-color: #fffaeb;\n}\n.message.is-warning .message-header {\n  background-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.message.is-warning .message-body {\n  border-color: hsl(44, 100%, 77%);\n  color: #946c00;\n}\n.message.is-danger {\n  background-color: #feecf0;\n}\n.message.is-danger .message-header {\n  background-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.message.is-danger .message-body {\n  border-color: hsl(348, 86%, 61%);\n  color: #cc0f35;\n}\n\n.message-header {\n  align-items: center;\n  background-color: #363636;\n  border-radius: 4px 4px 0 0;\n  color: #fff;\n  display: flex;\n  font-weight: 700;\n  justify-content: space-between;\n  line-height: 1.25;\n  padding: 0.75em 1em;\n  position: relative;\n}\n.message-header .delete {\n  flex-grow: 0;\n  flex-shrink: 0;\n  margin-left: 0.75em;\n}\n.message-header + .message-body {\n  border-width: 0;\n  border-top-left-radius: 0;\n  border-top-right-radius: 0;\n}\n\n.message-body {\n  border-color: hsl(0, 0%, 86%);\n  border-radius: 4px;\n  border-style: solid;\n  border-width: 0 0 0 4px;\n  color: #363636;\n  padding: 1.25em 1.5em;\n}\n.message-body code,\n.message-body pre {\n  background-color: hsl(0, 0%, 100%);\n}\n.message-body pre code {\n  background-color: transparent;\n}\n\n.modal {\n  align-items: center;\n  display: none;\n  flex-direction: column;\n  justify-content: center;\n  overflow: hidden;\n  position: fixed;\n  z-index: 40;\n}\n.modal.is-active {\n  display: flex;\n}\n\n.modal-background {\n  background-color: rgba(10, 10, 10, 0.86);\n}\n\n.modal-content,\n.modal-card {\n  margin: 0 20px;\n  max-height: calc(100vh - 160px);\n  overflow: auto;\n  position: relative;\n  width: 100%;\n}\n@media screen and (min-width: 769px) {\n  .modal-content,\n  .modal-card {\n    margin: 0 auto;\n    max-height: calc(100vh - 40px);\n    width: 640px;\n  }\n}\n\n.modal-close {\n  background: none;\n  height: 40px;\n  position: fixed;\n  right: 20px;\n  top: 20px;\n  width: 40px;\n}\n\n.modal-card {\n  display: flex;\n  flex-direction: column;\n  max-height: calc(100vh - 40px);\n  overflow: hidden;\n  -ms-overflow-y: visible;\n}\n\n.modal-card-head,\n.modal-card-foot {\n  align-items: center;\n  background-color: hsl(0, 0%, 96%);\n  display: flex;\n  flex-shrink: 0;\n  justify-content: flex-start;\n  padding: 20px;\n  position: relative;\n}\n\n.modal-card-head {\n  border-bottom: 1px solid hsl(0, 0%, 86%);\n  border-top-left-radius: 6px;\n  border-top-right-radius: 6px;\n}\n\n.modal-card-title {\n  color: #242424;\n  flex-grow: 1;\n  flex-shrink: 0;\n  font-size: 1.5rem;\n  line-height: 1;\n}\n\n.modal-card-foot {\n  border-bottom-left-radius: 6px;\n  border-bottom-right-radius: 6px;\n  border-top: 1px solid hsl(0, 0%, 86%);\n}\n.modal-card-foot .button:not(:last-child) {\n  margin-right: 0.5em;\n}\n\n.modal-card-body {\n  -webkit-overflow-scrolling: touch;\n  background-color: hsl(0, 0%, 100%);\n  flex-grow: 1;\n  flex-shrink: 1;\n  overflow: auto;\n  padding: 20px;\n}\n\n.navbar {\n  background-color: hsl(0, 0%, 100%);\n  min-height: 3.25rem;\n  position: relative;\n  z-index: 30;\n}\n.navbar.is-white {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.navbar.is-white .navbar-brand > .navbar-item,\n.navbar.is-white .navbar-brand .navbar-link {\n  color: hsl(0, 0%, 4%);\n}\n.navbar.is-white .navbar-brand > a.navbar-item:focus, .navbar.is-white .navbar-brand > a.navbar-item:hover, .navbar.is-white .navbar-brand > a.navbar-item.is-active,\n.navbar.is-white .navbar-brand .navbar-link:focus,\n.navbar.is-white .navbar-brand .navbar-link:hover,\n.navbar.is-white .navbar-brand .navbar-link.is-active {\n  background-color: #f2f2f2;\n  color: hsl(0, 0%, 4%);\n}\n.navbar.is-white .navbar-brand .navbar-link::after {\n  border-color: hsl(0, 0%, 4%);\n}\n.navbar.is-white .navbar-burger {\n  color: hsl(0, 0%, 4%);\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-white .navbar-start > .navbar-item,\n  .navbar.is-white .navbar-start .navbar-link,\n  .navbar.is-white .navbar-end > .navbar-item,\n  .navbar.is-white .navbar-end .navbar-link {\n    color: hsl(0, 0%, 4%);\n  }\n  .navbar.is-white .navbar-start > a.navbar-item:focus, .navbar.is-white .navbar-start > a.navbar-item:hover, .navbar.is-white .navbar-start > a.navbar-item.is-active,\n  .navbar.is-white .navbar-start .navbar-link:focus,\n  .navbar.is-white .navbar-start .navbar-link:hover,\n  .navbar.is-white .navbar-start .navbar-link.is-active,\n  .navbar.is-white .navbar-end > a.navbar-item:focus,\n  .navbar.is-white .navbar-end > a.navbar-item:hover,\n  .navbar.is-white .navbar-end > a.navbar-item.is-active,\n  .navbar.is-white .navbar-end .navbar-link:focus,\n  .navbar.is-white .navbar-end .navbar-link:hover,\n  .navbar.is-white .navbar-end .navbar-link.is-active {\n    background-color: #f2f2f2;\n    color: hsl(0, 0%, 4%);\n  }\n  .navbar.is-white .navbar-start .navbar-link::after,\n  .navbar.is-white .navbar-end .navbar-link::after {\n    border-color: hsl(0, 0%, 4%);\n  }\n  .navbar.is-white .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-white .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-white .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #f2f2f2;\n    color: hsl(0, 0%, 4%);\n  }\n  .navbar.is-white .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(0, 0%, 100%);\n    color: hsl(0, 0%, 4%);\n  }\n}\n.navbar.is-black {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.navbar.is-black .navbar-brand > .navbar-item,\n.navbar.is-black .navbar-brand .navbar-link {\n  color: hsl(0, 0%, 100%);\n}\n.navbar.is-black .navbar-brand > a.navbar-item:focus, .navbar.is-black .navbar-brand > a.navbar-item:hover, .navbar.is-black .navbar-brand > a.navbar-item.is-active,\n.navbar.is-black .navbar-brand .navbar-link:focus,\n.navbar.is-black .navbar-brand .navbar-link:hover,\n.navbar.is-black .navbar-brand .navbar-link.is-active {\n  background-color: black;\n  color: hsl(0, 0%, 100%);\n}\n.navbar.is-black .navbar-brand .navbar-link::after {\n  border-color: hsl(0, 0%, 100%);\n}\n.navbar.is-black .navbar-burger {\n  color: hsl(0, 0%, 100%);\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-black .navbar-start > .navbar-item,\n  .navbar.is-black .navbar-start .navbar-link,\n  .navbar.is-black .navbar-end > .navbar-item,\n  .navbar.is-black .navbar-end .navbar-link {\n    color: hsl(0, 0%, 100%);\n  }\n  .navbar.is-black .navbar-start > a.navbar-item:focus, .navbar.is-black .navbar-start > a.navbar-item:hover, .navbar.is-black .navbar-start > a.navbar-item.is-active,\n  .navbar.is-black .navbar-start .navbar-link:focus,\n  .navbar.is-black .navbar-start .navbar-link:hover,\n  .navbar.is-black .navbar-start .navbar-link.is-active,\n  .navbar.is-black .navbar-end > a.navbar-item:focus,\n  .navbar.is-black .navbar-end > a.navbar-item:hover,\n  .navbar.is-black .navbar-end > a.navbar-item.is-active,\n  .navbar.is-black .navbar-end .navbar-link:focus,\n  .navbar.is-black .navbar-end .navbar-link:hover,\n  .navbar.is-black .navbar-end .navbar-link.is-active {\n    background-color: black;\n    color: hsl(0, 0%, 100%);\n  }\n  .navbar.is-black .navbar-start .navbar-link::after,\n  .navbar.is-black .navbar-end .navbar-link::after {\n    border-color: hsl(0, 0%, 100%);\n  }\n  .navbar.is-black .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-black .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-black .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: black;\n    color: hsl(0, 0%, 100%);\n  }\n  .navbar.is-black .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(0, 0%, 4%);\n    color: hsl(0, 0%, 100%);\n  }\n}\n.navbar.is-light {\n  background-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-light .navbar-brand > .navbar-item,\n.navbar.is-light .navbar-brand .navbar-link {\n  color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-light .navbar-brand > a.navbar-item:focus, .navbar.is-light .navbar-brand > a.navbar-item:hover, .navbar.is-light .navbar-brand > a.navbar-item.is-active,\n.navbar.is-light .navbar-brand .navbar-link:focus,\n.navbar.is-light .navbar-brand .navbar-link:hover,\n.navbar.is-light .navbar-brand .navbar-link.is-active {\n  background-color: #e8e8e8;\n  color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-light .navbar-brand .navbar-link::after {\n  border-color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-light .navbar-burger {\n  color: rgba(0, 0, 0, 0.7);\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-light .navbar-start > .navbar-item,\n  .navbar.is-light .navbar-start .navbar-link,\n  .navbar.is-light .navbar-end > .navbar-item,\n  .navbar.is-light .navbar-end .navbar-link {\n    color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-light .navbar-start > a.navbar-item:focus, .navbar.is-light .navbar-start > a.navbar-item:hover, .navbar.is-light .navbar-start > a.navbar-item.is-active,\n  .navbar.is-light .navbar-start .navbar-link:focus,\n  .navbar.is-light .navbar-start .navbar-link:hover,\n  .navbar.is-light .navbar-start .navbar-link.is-active,\n  .navbar.is-light .navbar-end > a.navbar-item:focus,\n  .navbar.is-light .navbar-end > a.navbar-item:hover,\n  .navbar.is-light .navbar-end > a.navbar-item.is-active,\n  .navbar.is-light .navbar-end .navbar-link:focus,\n  .navbar.is-light .navbar-end .navbar-link:hover,\n  .navbar.is-light .navbar-end .navbar-link.is-active {\n    background-color: #e8e8e8;\n    color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-light .navbar-start .navbar-link::after,\n  .navbar.is-light .navbar-end .navbar-link::after {\n    border-color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-light .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-light .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-light .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #e8e8e8;\n    color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-light .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(0, 0%, 96%);\n    color: rgba(0, 0, 0, 0.7);\n  }\n}\n.navbar.is-dark {\n  background-color: #242424;\n  color: #fff;\n}\n.navbar.is-dark .navbar-brand > .navbar-item,\n.navbar.is-dark .navbar-brand .navbar-link {\n  color: #fff;\n}\n.navbar.is-dark .navbar-brand > a.navbar-item:focus, .navbar.is-dark .navbar-brand > a.navbar-item:hover, .navbar.is-dark .navbar-brand > a.navbar-item.is-active,\n.navbar.is-dark .navbar-brand .navbar-link:focus,\n.navbar.is-dark .navbar-brand .navbar-link:hover,\n.navbar.is-dark .navbar-brand .navbar-link.is-active {\n  background-color: #171717;\n  color: #fff;\n}\n.navbar.is-dark .navbar-brand .navbar-link::after {\n  border-color: #fff;\n}\n.navbar.is-dark .navbar-burger {\n  color: #fff;\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-dark .navbar-start > .navbar-item,\n  .navbar.is-dark .navbar-start .navbar-link,\n  .navbar.is-dark .navbar-end > .navbar-item,\n  .navbar.is-dark .navbar-end .navbar-link {\n    color: #fff;\n  }\n  .navbar.is-dark .navbar-start > a.navbar-item:focus, .navbar.is-dark .navbar-start > a.navbar-item:hover, .navbar.is-dark .navbar-start > a.navbar-item.is-active,\n  .navbar.is-dark .navbar-start .navbar-link:focus,\n  .navbar.is-dark .navbar-start .navbar-link:hover,\n  .navbar.is-dark .navbar-start .navbar-link.is-active,\n  .navbar.is-dark .navbar-end > a.navbar-item:focus,\n  .navbar.is-dark .navbar-end > a.navbar-item:hover,\n  .navbar.is-dark .navbar-end > a.navbar-item.is-active,\n  .navbar.is-dark .navbar-end .navbar-link:focus,\n  .navbar.is-dark .navbar-end .navbar-link:hover,\n  .navbar.is-dark .navbar-end .navbar-link.is-active {\n    background-color: #171717;\n    color: #fff;\n  }\n  .navbar.is-dark .navbar-start .navbar-link::after,\n  .navbar.is-dark .navbar-end .navbar-link::after {\n    border-color: #fff;\n  }\n  .navbar.is-dark .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-dark .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-dark .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #171717;\n    color: #fff;\n  }\n  .navbar.is-dark .navbar-dropdown a.navbar-item.is-active {\n    background-color: #242424;\n    color: #fff;\n  }\n}\n.navbar.is-primary {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.navbar.is-primary .navbar-brand > .navbar-item,\n.navbar.is-primary .navbar-brand .navbar-link {\n  color: #fff;\n}\n.navbar.is-primary .navbar-brand > a.navbar-item:focus, .navbar.is-primary .navbar-brand > a.navbar-item:hover, .navbar.is-primary .navbar-brand > a.navbar-item.is-active,\n.navbar.is-primary .navbar-brand .navbar-link:focus,\n.navbar.is-primary .navbar-brand .navbar-link:hover,\n.navbar.is-primary .navbar-brand .navbar-link.is-active {\n  background-color: #00b89c;\n  color: #fff;\n}\n.navbar.is-primary .navbar-brand .navbar-link::after {\n  border-color: #fff;\n}\n.navbar.is-primary .navbar-burger {\n  color: #fff;\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-primary .navbar-start > .navbar-item,\n  .navbar.is-primary .navbar-start .navbar-link,\n  .navbar.is-primary .navbar-end > .navbar-item,\n  .navbar.is-primary .navbar-end .navbar-link {\n    color: #fff;\n  }\n  .navbar.is-primary .navbar-start > a.navbar-item:focus, .navbar.is-primary .navbar-start > a.navbar-item:hover, .navbar.is-primary .navbar-start > a.navbar-item.is-active,\n  .navbar.is-primary .navbar-start .navbar-link:focus,\n  .navbar.is-primary .navbar-start .navbar-link:hover,\n  .navbar.is-primary .navbar-start .navbar-link.is-active,\n  .navbar.is-primary .navbar-end > a.navbar-item:focus,\n  .navbar.is-primary .navbar-end > a.navbar-item:hover,\n  .navbar.is-primary .navbar-end > a.navbar-item.is-active,\n  .navbar.is-primary .navbar-end .navbar-link:focus,\n  .navbar.is-primary .navbar-end .navbar-link:hover,\n  .navbar.is-primary .navbar-end .navbar-link.is-active {\n    background-color: #00b89c;\n    color: #fff;\n  }\n  .navbar.is-primary .navbar-start .navbar-link::after,\n  .navbar.is-primary .navbar-end .navbar-link::after {\n    border-color: #fff;\n  }\n  .navbar.is-primary .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-primary .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-primary .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #00b89c;\n    color: #fff;\n  }\n  .navbar.is-primary .navbar-dropdown a.navbar-item.is-active {\n    background-color: #00d1b2;\n    color: #fff;\n  }\n}\n.navbar.is-link {\n  background-color: #3273dc;\n  color: #fff;\n}\n.navbar.is-link .navbar-brand > .navbar-item,\n.navbar.is-link .navbar-brand .navbar-link {\n  color: #fff;\n}\n.navbar.is-link .navbar-brand > a.navbar-item:focus, .navbar.is-link .navbar-brand > a.navbar-item:hover, .navbar.is-link .navbar-brand > a.navbar-item.is-active,\n.navbar.is-link .navbar-brand .navbar-link:focus,\n.navbar.is-link .navbar-brand .navbar-link:hover,\n.navbar.is-link .navbar-brand .navbar-link.is-active {\n  background-color: #2466d1;\n  color: #fff;\n}\n.navbar.is-link .navbar-brand .navbar-link::after {\n  border-color: #fff;\n}\n.navbar.is-link .navbar-burger {\n  color: #fff;\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-link .navbar-start > .navbar-item,\n  .navbar.is-link .navbar-start .navbar-link,\n  .navbar.is-link .navbar-end > .navbar-item,\n  .navbar.is-link .navbar-end .navbar-link {\n    color: #fff;\n  }\n  .navbar.is-link .navbar-start > a.navbar-item:focus, .navbar.is-link .navbar-start > a.navbar-item:hover, .navbar.is-link .navbar-start > a.navbar-item.is-active,\n  .navbar.is-link .navbar-start .navbar-link:focus,\n  .navbar.is-link .navbar-start .navbar-link:hover,\n  .navbar.is-link .navbar-start .navbar-link.is-active,\n  .navbar.is-link .navbar-end > a.navbar-item:focus,\n  .navbar.is-link .navbar-end > a.navbar-item:hover,\n  .navbar.is-link .navbar-end > a.navbar-item.is-active,\n  .navbar.is-link .navbar-end .navbar-link:focus,\n  .navbar.is-link .navbar-end .navbar-link:hover,\n  .navbar.is-link .navbar-end .navbar-link.is-active {\n    background-color: #2466d1;\n    color: #fff;\n  }\n  .navbar.is-link .navbar-start .navbar-link::after,\n  .navbar.is-link .navbar-end .navbar-link::after {\n    border-color: #fff;\n  }\n  .navbar.is-link .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-link .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-link .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #2466d1;\n    color: #fff;\n  }\n  .navbar.is-link .navbar-dropdown a.navbar-item.is-active {\n    background-color: #3273dc;\n    color: #fff;\n  }\n}\n.navbar.is-info {\n  background-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.navbar.is-info .navbar-brand > .navbar-item,\n.navbar.is-info .navbar-brand .navbar-link {\n  color: #fff;\n}\n.navbar.is-info .navbar-brand > a.navbar-item:focus, .navbar.is-info .navbar-brand > a.navbar-item:hover, .navbar.is-info .navbar-brand > a.navbar-item.is-active,\n.navbar.is-info .navbar-brand .navbar-link:focus,\n.navbar.is-info .navbar-brand .navbar-link:hover,\n.navbar.is-info .navbar-brand .navbar-link.is-active {\n  background-color: #3082c5;\n  color: #fff;\n}\n.navbar.is-info .navbar-brand .navbar-link::after {\n  border-color: #fff;\n}\n.navbar.is-info .navbar-burger {\n  color: #fff;\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-info .navbar-start > .navbar-item,\n  .navbar.is-info .navbar-start .navbar-link,\n  .navbar.is-info .navbar-end > .navbar-item,\n  .navbar.is-info .navbar-end .navbar-link {\n    color: #fff;\n  }\n  .navbar.is-info .navbar-start > a.navbar-item:focus, .navbar.is-info .navbar-start > a.navbar-item:hover, .navbar.is-info .navbar-start > a.navbar-item.is-active,\n  .navbar.is-info .navbar-start .navbar-link:focus,\n  .navbar.is-info .navbar-start .navbar-link:hover,\n  .navbar.is-info .navbar-start .navbar-link.is-active,\n  .navbar.is-info .navbar-end > a.navbar-item:focus,\n  .navbar.is-info .navbar-end > a.navbar-item:hover,\n  .navbar.is-info .navbar-end > a.navbar-item.is-active,\n  .navbar.is-info .navbar-end .navbar-link:focus,\n  .navbar.is-info .navbar-end .navbar-link:hover,\n  .navbar.is-info .navbar-end .navbar-link.is-active {\n    background-color: #3082c5;\n    color: #fff;\n  }\n  .navbar.is-info .navbar-start .navbar-link::after,\n  .navbar.is-info .navbar-end .navbar-link::after {\n    border-color: #fff;\n  }\n  .navbar.is-info .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-info .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-info .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #3082c5;\n    color: #fff;\n  }\n  .navbar.is-info .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(207, 61%, 53%);\n    color: #fff;\n  }\n}\n.navbar.is-success {\n  background-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.navbar.is-success .navbar-brand > .navbar-item,\n.navbar.is-success .navbar-brand .navbar-link {\n  color: #fff;\n}\n.navbar.is-success .navbar-brand > a.navbar-item:focus, .navbar.is-success .navbar-brand > a.navbar-item:hover, .navbar.is-success .navbar-brand > a.navbar-item.is-active,\n.navbar.is-success .navbar-brand .navbar-link:focus,\n.navbar.is-success .navbar-brand .navbar-link:hover,\n.navbar.is-success .navbar-brand .navbar-link.is-active {\n  background-color: #3abb81;\n  color: #fff;\n}\n.navbar.is-success .navbar-brand .navbar-link::after {\n  border-color: #fff;\n}\n.navbar.is-success .navbar-burger {\n  color: #fff;\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-success .navbar-start > .navbar-item,\n  .navbar.is-success .navbar-start .navbar-link,\n  .navbar.is-success .navbar-end > .navbar-item,\n  .navbar.is-success .navbar-end .navbar-link {\n    color: #fff;\n  }\n  .navbar.is-success .navbar-start > a.navbar-item:focus, .navbar.is-success .navbar-start > a.navbar-item:hover, .navbar.is-success .navbar-start > a.navbar-item.is-active,\n  .navbar.is-success .navbar-start .navbar-link:focus,\n  .navbar.is-success .navbar-start .navbar-link:hover,\n  .navbar.is-success .navbar-start .navbar-link.is-active,\n  .navbar.is-success .navbar-end > a.navbar-item:focus,\n  .navbar.is-success .navbar-end > a.navbar-item:hover,\n  .navbar.is-success .navbar-end > a.navbar-item.is-active,\n  .navbar.is-success .navbar-end .navbar-link:focus,\n  .navbar.is-success .navbar-end .navbar-link:hover,\n  .navbar.is-success .navbar-end .navbar-link.is-active {\n    background-color: #3abb81;\n    color: #fff;\n  }\n  .navbar.is-success .navbar-start .navbar-link::after,\n  .navbar.is-success .navbar-end .navbar-link::after {\n    border-color: #fff;\n  }\n  .navbar.is-success .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-success .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-success .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #3abb81;\n    color: #fff;\n  }\n  .navbar.is-success .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(153, 53%, 53%);\n    color: #fff;\n  }\n}\n.navbar.is-warning {\n  background-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-warning .navbar-brand > .navbar-item,\n.navbar.is-warning .navbar-brand .navbar-link {\n  color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-warning .navbar-brand > a.navbar-item:focus, .navbar.is-warning .navbar-brand > a.navbar-item:hover, .navbar.is-warning .navbar-brand > a.navbar-item.is-active,\n.navbar.is-warning .navbar-brand .navbar-link:focus,\n.navbar.is-warning .navbar-brand .navbar-link:hover,\n.navbar.is-warning .navbar-brand .navbar-link.is-active {\n  background-color: #ffd970;\n  color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-warning .navbar-brand .navbar-link::after {\n  border-color: rgba(0, 0, 0, 0.7);\n}\n.navbar.is-warning .navbar-burger {\n  color: rgba(0, 0, 0, 0.7);\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-warning .navbar-start > .navbar-item,\n  .navbar.is-warning .navbar-start .navbar-link,\n  .navbar.is-warning .navbar-end > .navbar-item,\n  .navbar.is-warning .navbar-end .navbar-link {\n    color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-warning .navbar-start > a.navbar-item:focus, .navbar.is-warning .navbar-start > a.navbar-item:hover, .navbar.is-warning .navbar-start > a.navbar-item.is-active,\n  .navbar.is-warning .navbar-start .navbar-link:focus,\n  .navbar.is-warning .navbar-start .navbar-link:hover,\n  .navbar.is-warning .navbar-start .navbar-link.is-active,\n  .navbar.is-warning .navbar-end > a.navbar-item:focus,\n  .navbar.is-warning .navbar-end > a.navbar-item:hover,\n  .navbar.is-warning .navbar-end > a.navbar-item.is-active,\n  .navbar.is-warning .navbar-end .navbar-link:focus,\n  .navbar.is-warning .navbar-end .navbar-link:hover,\n  .navbar.is-warning .navbar-end .navbar-link.is-active {\n    background-color: #ffd970;\n    color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-warning .navbar-start .navbar-link::after,\n  .navbar.is-warning .navbar-end .navbar-link::after {\n    border-color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-warning .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-warning .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-warning .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #ffd970;\n    color: rgba(0, 0, 0, 0.7);\n  }\n  .navbar.is-warning .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(44, 100%, 77%);\n    color: rgba(0, 0, 0, 0.7);\n  }\n}\n.navbar.is-danger {\n  background-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.navbar.is-danger .navbar-brand > .navbar-item,\n.navbar.is-danger .navbar-brand .navbar-link {\n  color: #fff;\n}\n.navbar.is-danger .navbar-brand > a.navbar-item:focus, .navbar.is-danger .navbar-brand > a.navbar-item:hover, .navbar.is-danger .navbar-brand > a.navbar-item.is-active,\n.navbar.is-danger .navbar-brand .navbar-link:focus,\n.navbar.is-danger .navbar-brand .navbar-link:hover,\n.navbar.is-danger .navbar-brand .navbar-link.is-active {\n  background-color: #ef2e55;\n  color: #fff;\n}\n.navbar.is-danger .navbar-brand .navbar-link::after {\n  border-color: #fff;\n}\n.navbar.is-danger .navbar-burger {\n  color: #fff;\n}\n@media screen and (min-width: 1024px) {\n  .navbar.is-danger .navbar-start > .navbar-item,\n  .navbar.is-danger .navbar-start .navbar-link,\n  .navbar.is-danger .navbar-end > .navbar-item,\n  .navbar.is-danger .navbar-end .navbar-link {\n    color: #fff;\n  }\n  .navbar.is-danger .navbar-start > a.navbar-item:focus, .navbar.is-danger .navbar-start > a.navbar-item:hover, .navbar.is-danger .navbar-start > a.navbar-item.is-active,\n  .navbar.is-danger .navbar-start .navbar-link:focus,\n  .navbar.is-danger .navbar-start .navbar-link:hover,\n  .navbar.is-danger .navbar-start .navbar-link.is-active,\n  .navbar.is-danger .navbar-end > a.navbar-item:focus,\n  .navbar.is-danger .navbar-end > a.navbar-item:hover,\n  .navbar.is-danger .navbar-end > a.navbar-item.is-active,\n  .navbar.is-danger .navbar-end .navbar-link:focus,\n  .navbar.is-danger .navbar-end .navbar-link:hover,\n  .navbar.is-danger .navbar-end .navbar-link.is-active {\n    background-color: #ef2e55;\n    color: #fff;\n  }\n  .navbar.is-danger .navbar-start .navbar-link::after,\n  .navbar.is-danger .navbar-end .navbar-link::after {\n    border-color: #fff;\n  }\n  .navbar.is-danger .navbar-item.has-dropdown:focus .navbar-link,\n  .navbar.is-danger .navbar-item.has-dropdown:hover .navbar-link,\n  .navbar.is-danger .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: #ef2e55;\n    color: #fff;\n  }\n  .navbar.is-danger .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(348, 86%, 61%);\n    color: #fff;\n  }\n}\n.navbar > .container {\n  align-items: stretch;\n  display: flex;\n  min-height: 3.25rem;\n  width: 100%;\n}\n.navbar.has-shadow {\n  box-shadow: 0 2px 0 0 hsl(0, 0%, 96%);\n}\n.navbar.is-fixed-bottom, .navbar.is-fixed-top {\n  left: 0;\n  position: fixed;\n  right: 0;\n  z-index: 30;\n}\n.navbar.is-fixed-bottom {\n  bottom: 0;\n}\n.navbar.is-fixed-bottom.has-shadow {\n  box-shadow: 0 -2px 0 0 hsl(0, 0%, 96%);\n}\n.navbar.is-fixed-top {\n  top: 0;\n}\n\nhtml.has-navbar-fixed-top,\nbody.has-navbar-fixed-top {\n  padding-top: 3.25rem;\n}\nhtml.has-navbar-fixed-bottom,\nbody.has-navbar-fixed-bottom {\n  padding-bottom: 3.25rem;\n}\n\n.navbar-brand,\n.navbar-tabs {\n  align-items: stretch;\n  display: flex;\n  flex-shrink: 0;\n  min-height: 3.25rem;\n}\n\n.navbar-brand a.navbar-item:focus, .navbar-brand a.navbar-item:hover {\n  background-color: transparent;\n}\n\n.navbar-tabs {\n  -webkit-overflow-scrolling: touch;\n  max-width: 100vw;\n  overflow-x: auto;\n  overflow-y: hidden;\n}\n\n.navbar-burger {\n  color: #363636;\n  -moz-appearance: none;\n  -webkit-appearance: none;\n  appearance: none;\n  background: none;\n  border: none;\n  cursor: pointer;\n  display: block;\n  height: 3.25rem;\n  position: relative;\n  width: 3.25rem;\n  margin-left: auto;\n}\n.navbar-burger span {\n  background-color: currentColor;\n  display: block;\n  height: 1px;\n  left: calc(50% - 8px);\n  position: absolute;\n  transform-origin: center;\n  transition-duration: 86ms;\n  transition-property: background-color, opacity, transform;\n  transition-timing-function: ease-out;\n  width: 16px;\n}\n.navbar-burger span:nth-child(1) {\n  top: calc(50% - 6px);\n}\n.navbar-burger span:nth-child(2) {\n  top: calc(50% - 1px);\n}\n.navbar-burger span:nth-child(3) {\n  top: calc(50% + 4px);\n}\n.navbar-burger:hover {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n.navbar-burger.is-active span:nth-child(1) {\n  transform: translateY(5px) rotate(45deg);\n}\n.navbar-burger.is-active span:nth-child(2) {\n  opacity: 0;\n}\n.navbar-burger.is-active span:nth-child(3) {\n  transform: translateY(-5px) rotate(-45deg);\n}\n\n.navbar-menu {\n  display: none;\n}\n\n.navbar-item,\n.navbar-link {\n  color: #363636;\n  display: block;\n  line-height: 1.5;\n  padding: 0.5rem 0.75rem;\n  position: relative;\n}\n.navbar-item .icon:only-child,\n.navbar-link .icon:only-child {\n  margin-left: -0.25rem;\n  margin-right: -0.25rem;\n}\n\na.navbar-item,\n.navbar-link {\n  cursor: pointer;\n}\na.navbar-item:focus, a.navbar-item:focus-within, a.navbar-item:hover, a.navbar-item.is-active,\n.navbar-link:focus,\n.navbar-link:focus-within,\n.navbar-link:hover,\n.navbar-link.is-active {\n  background-color: hsl(0, 0%, 98%);\n  color: #3273dc;\n}\n\n.navbar-item {\n  flex-grow: 0;\n  flex-shrink: 0;\n}\n.navbar-item img {\n  max-height: 1.75rem;\n}\n.navbar-item.has-dropdown {\n  padding: 0;\n}\n.navbar-item.is-expanded {\n  flex-grow: 1;\n  flex-shrink: 1;\n}\n.navbar-item.is-tab {\n  border-bottom: 1px solid transparent;\n  min-height: 3.25rem;\n  padding-bottom: calc(0.5rem - 1px);\n}\n.navbar-item.is-tab:focus, .navbar-item.is-tab:hover {\n  background-color: transparent;\n  border-bottom-color: #3273dc;\n}\n.navbar-item.is-tab.is-active {\n  background-color: transparent;\n  border-bottom-color: #3273dc;\n  border-bottom-style: solid;\n  border-bottom-width: 3px;\n  color: #3273dc;\n  padding-bottom: calc(0.5rem - 3px);\n}\n\n.navbar-content {\n  flex-grow: 1;\n  flex-shrink: 1;\n}\n\n.navbar-link:not(.is-arrowless) {\n  padding-right: 2.5em;\n}\n.navbar-link:not(.is-arrowless)::after {\n  border-color: #3273dc;\n  margin-top: -0.375em;\n  right: 1.125em;\n}\n\n.navbar-dropdown {\n  font-size: 0.875rem;\n  padding-bottom: 0.5rem;\n  padding-top: 0.5rem;\n}\n.navbar-dropdown .navbar-item {\n  padding-left: 1.5rem;\n  padding-right: 1.5rem;\n}\n\n.navbar-divider {\n  background-color: hsl(0, 0%, 96%);\n  border: none;\n  display: none;\n  height: 2px;\n  margin: 0.5rem 0;\n}\n\n@media screen and (max-width: 1023px) {\n  .navbar > .container {\n    display: block;\n  }\n  .navbar-brand .navbar-item,\n  .navbar-tabs .navbar-item {\n    align-items: center;\n    display: flex;\n  }\n  .navbar-link::after {\n    display: none;\n  }\n  .navbar-menu {\n    background-color: hsl(0, 0%, 100%);\n    box-shadow: 0 8px 16px rgba(10, 10, 10, 0.1);\n    padding: 0.5rem 0;\n  }\n  .navbar-menu.is-active {\n    display: block;\n  }\n  .navbar.is-fixed-bottom-touch, .navbar.is-fixed-top-touch {\n    left: 0;\n    position: fixed;\n    right: 0;\n    z-index: 30;\n  }\n  .navbar.is-fixed-bottom-touch {\n    bottom: 0;\n  }\n  .navbar.is-fixed-bottom-touch.has-shadow {\n    box-shadow: 0 -2px 3px rgba(10, 10, 10, 0.1);\n  }\n  .navbar.is-fixed-top-touch {\n    top: 0;\n  }\n  .navbar.is-fixed-top .navbar-menu, .navbar.is-fixed-top-touch .navbar-menu {\n    -webkit-overflow-scrolling: touch;\n    max-height: calc(100vh - 3.25rem);\n    overflow: auto;\n  }\n  html.has-navbar-fixed-top-touch,\n  body.has-navbar-fixed-top-touch {\n    padding-top: 3.25rem;\n  }\n  html.has-navbar-fixed-bottom-touch,\n  body.has-navbar-fixed-bottom-touch {\n    padding-bottom: 3.25rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .navbar,\n  .navbar-menu,\n  .navbar-start,\n  .navbar-end {\n    align-items: stretch;\n    display: flex;\n  }\n  .navbar {\n    min-height: 3.25rem;\n  }\n  .navbar.is-spaced {\n    padding: 1rem 2rem;\n  }\n  .navbar.is-spaced .navbar-start,\n  .navbar.is-spaced .navbar-end {\n    align-items: center;\n  }\n  .navbar.is-spaced a.navbar-item,\n  .navbar.is-spaced .navbar-link {\n    border-radius: 4px;\n  }\n  .navbar.is-transparent a.navbar-item:focus, .navbar.is-transparent a.navbar-item:hover, .navbar.is-transparent a.navbar-item.is-active,\n  .navbar.is-transparent .navbar-link:focus,\n  .navbar.is-transparent .navbar-link:hover,\n  .navbar.is-transparent .navbar-link.is-active {\n    background-color: transparent !important;\n  }\n  .navbar.is-transparent .navbar-item.has-dropdown.is-active .navbar-link, .navbar.is-transparent .navbar-item.has-dropdown.is-hoverable:focus .navbar-link, .navbar.is-transparent .navbar-item.has-dropdown.is-hoverable:focus-within .navbar-link, .navbar.is-transparent .navbar-item.has-dropdown.is-hoverable:hover .navbar-link {\n    background-color: transparent !important;\n  }\n  .navbar.is-transparent .navbar-dropdown a.navbar-item:focus, .navbar.is-transparent .navbar-dropdown a.navbar-item:hover {\n    background-color: hsl(0, 0%, 96%);\n    color: hsl(0, 0%, 4%);\n  }\n  .navbar.is-transparent .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(0, 0%, 96%);\n    color: #3273dc;\n  }\n  .navbar-burger {\n    display: none;\n  }\n  .navbar-item,\n  .navbar-link {\n    align-items: center;\n    display: flex;\n  }\n  .navbar-item.has-dropdown {\n    align-items: stretch;\n  }\n  .navbar-item.has-dropdown-up .navbar-link::after {\n    transform: rotate(135deg) translate(0.25em, -0.25em);\n  }\n  .navbar-item.has-dropdown-up .navbar-dropdown {\n    border-bottom: 2px solid hsl(0, 0%, 86%);\n    border-radius: 6px 6px 0 0;\n    border-top: none;\n    bottom: 100%;\n    box-shadow: 0 -8px 8px rgba(10, 10, 10, 0.1);\n    top: auto;\n  }\n  .navbar-item.is-active .navbar-dropdown, .navbar-item.is-hoverable:focus .navbar-dropdown, .navbar-item.is-hoverable:focus-within .navbar-dropdown, .navbar-item.is-hoverable:hover .navbar-dropdown {\n    display: block;\n  }\n  .navbar.is-spaced .navbar-item.is-active .navbar-dropdown, .navbar-item.is-active .navbar-dropdown.is-boxed, .navbar.is-spaced .navbar-item.is-hoverable:focus .navbar-dropdown, .navbar-item.is-hoverable:focus .navbar-dropdown.is-boxed, .navbar.is-spaced .navbar-item.is-hoverable:focus-within .navbar-dropdown, .navbar-item.is-hoverable:focus-within .navbar-dropdown.is-boxed, .navbar.is-spaced .navbar-item.is-hoverable:hover .navbar-dropdown, .navbar-item.is-hoverable:hover .navbar-dropdown.is-boxed {\n    opacity: 1;\n    pointer-events: auto;\n    transform: translateY(0);\n  }\n  .navbar-menu {\n    flex-grow: 1;\n    flex-shrink: 0;\n  }\n  .navbar-start {\n    justify-content: flex-start;\n    margin-right: auto;\n  }\n  .navbar-end {\n    justify-content: flex-end;\n    margin-left: auto;\n  }\n  .navbar-dropdown {\n    background-color: hsl(0, 0%, 100%);\n    border-bottom-left-radius: 6px;\n    border-bottom-right-radius: 6px;\n    border-top: 2px solid hsl(0, 0%, 86%);\n    box-shadow: 0 8px 8px rgba(10, 10, 10, 0.1);\n    display: none;\n    font-size: 0.875rem;\n    left: 0;\n    min-width: 100%;\n    position: absolute;\n    top: 100%;\n    z-index: 20;\n  }\n  .navbar-dropdown .navbar-item {\n    padding: 0.375rem 1rem;\n    white-space: nowrap;\n  }\n  .navbar-dropdown a.navbar-item {\n    padding-right: 3rem;\n  }\n  .navbar-dropdown a.navbar-item:focus, .navbar-dropdown a.navbar-item:hover {\n    background-color: hsl(0, 0%, 96%);\n    color: hsl(0, 0%, 4%);\n  }\n  .navbar-dropdown a.navbar-item.is-active {\n    background-color: hsl(0, 0%, 96%);\n    color: #3273dc;\n  }\n  .navbar.is-spaced .navbar-dropdown, .navbar-dropdown.is-boxed {\n    border-radius: 6px;\n    border-top: none;\n    box-shadow: 0 8px 8px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);\n    display: block;\n    opacity: 0;\n    pointer-events: none;\n    top: calc(100% + (-4px));\n    transform: translateY(-5px);\n    transition-duration: 86ms;\n    transition-property: opacity, transform;\n  }\n  .navbar-dropdown.is-right {\n    left: auto;\n    right: 0;\n  }\n  .navbar-divider {\n    display: block;\n  }\n  .navbar > .container .navbar-brand,\n  .container > .navbar .navbar-brand {\n    margin-left: -0.75rem;\n  }\n  .navbar > .container .navbar-menu,\n  .container > .navbar .navbar-menu {\n    margin-right: -0.75rem;\n  }\n  .navbar.is-fixed-bottom-desktop, .navbar.is-fixed-top-desktop {\n    left: 0;\n    position: fixed;\n    right: 0;\n    z-index: 30;\n  }\n  .navbar.is-fixed-bottom-desktop {\n    bottom: 0;\n  }\n  .navbar.is-fixed-bottom-desktop.has-shadow {\n    box-shadow: 0 -2px 3px rgba(10, 10, 10, 0.1);\n  }\n  .navbar.is-fixed-top-desktop {\n    top: 0;\n  }\n  html.has-navbar-fixed-top-desktop,\n  body.has-navbar-fixed-top-desktop {\n    padding-top: 3.25rem;\n  }\n  html.has-navbar-fixed-bottom-desktop,\n  body.has-navbar-fixed-bottom-desktop {\n    padding-bottom: 3.25rem;\n  }\n  html.has-spaced-navbar-fixed-top,\n  body.has-spaced-navbar-fixed-top {\n    padding-top: 5.25rem;\n  }\n  html.has-spaced-navbar-fixed-bottom,\n  body.has-spaced-navbar-fixed-bottom {\n    padding-bottom: 5.25rem;\n  }\n  a.navbar-item.is-active,\n  .navbar-link.is-active {\n    color: hsl(0, 0%, 4%);\n  }\n  a.navbar-item.is-active:not(:focus):not(:hover),\n  .navbar-link.is-active:not(:focus):not(:hover) {\n    background-color: transparent;\n  }\n  .navbar-item.has-dropdown:focus .navbar-link, .navbar-item.has-dropdown:hover .navbar-link, .navbar-item.has-dropdown.is-active .navbar-link {\n    background-color: hsl(0, 0%, 98%);\n  }\n}\n.hero.is-fullheight-with-navbar {\n  min-height: calc(100vh - 3.25rem);\n}\n\n.pagination {\n  font-size: 1rem;\n  margin: -0.25rem;\n}\n.pagination.is-small {\n  font-size: 0.75rem;\n}\n.pagination.is-medium {\n  font-size: 1.25rem;\n}\n.pagination.is-large {\n  font-size: 1.5rem;\n}\n.pagination.is-rounded .pagination-previous,\n.pagination.is-rounded .pagination-next {\n  padding-left: 1em;\n  padding-right: 1em;\n  border-radius: 9999px;\n}\n.pagination.is-rounded .pagination-link {\n  border-radius: 9999px;\n}\n\n.pagination,\n.pagination-list {\n  align-items: center;\n  display: flex;\n  justify-content: center;\n  text-align: center;\n}\n\n.pagination-previous,\n.pagination-next,\n.pagination-link,\n.pagination-ellipsis {\n  font-size: 1em;\n  justify-content: center;\n  margin: 0.25rem;\n  padding-left: 0.5em;\n  padding-right: 0.5em;\n  text-align: center;\n}\n\n.pagination-previous,\n.pagination-next,\n.pagination-link {\n  border-color: hsl(0, 0%, 86%);\n  color: #242424;\n  min-width: 2.5em;\n}\n.pagination-previous:hover,\n.pagination-next:hover,\n.pagination-link:hover {\n  border-color: #dbdbdb;\n  color: #242424;\n}\n.pagination-previous:focus,\n.pagination-next:focus,\n.pagination-link:focus {\n  border-color: hsl(229, 53%, 53%);\n}\n.pagination-previous:active,\n.pagination-next:active,\n.pagination-link:active {\n  box-shadow: inset 0 1px 2px rgba(10, 10, 10, 0.2);\n}\n.pagination-previous[disabled], .pagination-previous.is-disabled,\n.pagination-next[disabled],\n.pagination-next.is-disabled,\n.pagination-link[disabled],\n.pagination-link.is-disabled {\n  background-color: hsl(0, 0%, 86%);\n  border-color: hsl(0, 0%, 86%);\n  box-shadow: none;\n  color: hsl(0, 0%, 48%);\n  opacity: 0.5;\n}\n\n.pagination-previous,\n.pagination-next {\n  padding-left: 0.75em;\n  padding-right: 0.75em;\n  white-space: nowrap;\n}\n\n.pagination-link.is-current {\n  background-color: #3273dc;\n  border-color: #3273dc;\n  color: #fff;\n}\n\n.pagination-ellipsis {\n  color: #dbdbdb;\n  pointer-events: none;\n}\n\n.pagination-list {\n  flex-wrap: wrap;\n}\n.pagination-list li {\n  list-style: none;\n}\n\n@media screen and (max-width: 768px) {\n  .pagination {\n    flex-wrap: wrap;\n  }\n  .pagination-previous,\n  .pagination-next {\n    flex-grow: 1;\n    flex-shrink: 1;\n  }\n  .pagination-list li {\n    flex-grow: 1;\n    flex-shrink: 1;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .pagination-list {\n    flex-grow: 1;\n    flex-shrink: 1;\n    justify-content: flex-start;\n    order: 1;\n  }\n  .pagination-previous,\n  .pagination-next,\n  .pagination-link,\n  .pagination-ellipsis {\n    margin-bottom: 0;\n    margin-top: 0;\n  }\n  .pagination-previous {\n    order: 2;\n  }\n  .pagination-next {\n    order: 3;\n  }\n  .pagination {\n    justify-content: space-between;\n    margin-bottom: 0;\n    margin-top: 0;\n  }\n  .pagination.is-centered .pagination-previous {\n    order: 1;\n  }\n  .pagination.is-centered .pagination-list {\n    justify-content: center;\n    order: 2;\n  }\n  .pagination.is-centered .pagination-next {\n    order: 3;\n  }\n  .pagination.is-right .pagination-previous {\n    order: 1;\n  }\n  .pagination.is-right .pagination-next {\n    order: 2;\n  }\n  .pagination.is-right .pagination-list {\n    justify-content: flex-end;\n    order: 3;\n  }\n}\n.panel {\n  border-radius: 6px;\n  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);\n  font-size: 1rem;\n}\n.panel:not(:last-child) {\n  margin-bottom: 1.5rem;\n}\n.panel.is-white .panel-heading {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.panel.is-white .panel-tabs a.is-active {\n  border-bottom-color: hsl(0, 0%, 100%);\n}\n.panel.is-white .panel-block.is-active .panel-icon {\n  color: hsl(0, 0%, 100%);\n}\n.panel.is-black .panel-heading {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.panel.is-black .panel-tabs a.is-active {\n  border-bottom-color: hsl(0, 0%, 4%);\n}\n.panel.is-black .panel-block.is-active .panel-icon {\n  color: hsl(0, 0%, 4%);\n}\n.panel.is-light .panel-heading {\n  background-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.panel.is-light .panel-tabs a.is-active {\n  border-bottom-color: hsl(0, 0%, 96%);\n}\n.panel.is-light .panel-block.is-active .panel-icon {\n  color: hsl(0, 0%, 96%);\n}\n.panel.is-dark .panel-heading {\n  background-color: #242424;\n  color: #fff;\n}\n.panel.is-dark .panel-tabs a.is-active {\n  border-bottom-color: #242424;\n}\n.panel.is-dark .panel-block.is-active .panel-icon {\n  color: #242424;\n}\n.panel.is-primary .panel-heading {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.panel.is-primary .panel-tabs a.is-active {\n  border-bottom-color: #00d1b2;\n}\n.panel.is-primary .panel-block.is-active .panel-icon {\n  color: #00d1b2;\n}\n.panel.is-link .panel-heading {\n  background-color: #3273dc;\n  color: #fff;\n}\n.panel.is-link .panel-tabs a.is-active {\n  border-bottom-color: #3273dc;\n}\n.panel.is-link .panel-block.is-active .panel-icon {\n  color: #3273dc;\n}\n.panel.is-info .panel-heading {\n  background-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.panel.is-info .panel-tabs a.is-active {\n  border-bottom-color: hsl(207, 61%, 53%);\n}\n.panel.is-info .panel-block.is-active .panel-icon {\n  color: hsl(207, 61%, 53%);\n}\n.panel.is-success .panel-heading {\n  background-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.panel.is-success .panel-tabs a.is-active {\n  border-bottom-color: hsl(153, 53%, 53%);\n}\n.panel.is-success .panel-block.is-active .panel-icon {\n  color: hsl(153, 53%, 53%);\n}\n.panel.is-warning .panel-heading {\n  background-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.panel.is-warning .panel-tabs a.is-active {\n  border-bottom-color: hsl(44, 100%, 77%);\n}\n.panel.is-warning .panel-block.is-active .panel-icon {\n  color: hsl(44, 100%, 77%);\n}\n.panel.is-danger .panel-heading {\n  background-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.panel.is-danger .panel-tabs a.is-active {\n  border-bottom-color: hsl(348, 86%, 61%);\n}\n.panel.is-danger .panel-block.is-active .panel-icon {\n  color: hsl(348, 86%, 61%);\n}\n\n.panel-tabs:not(:last-child),\n.panel-block:not(:last-child) {\n  border-bottom: 1px solid hsl(0, 0%, 93%);\n}\n\n.panel-heading {\n  background-color: hsl(0, 0%, 93%);\n  border-radius: 6px 6px 0 0;\n  color: #242424;\n  font-size: 1.25em;\n  font-weight: 700;\n  line-height: 1.25;\n  padding: 0.75em 1em;\n}\n\n.panel-tabs {\n  align-items: flex-end;\n  display: flex;\n  font-size: 0.875em;\n  justify-content: center;\n}\n.panel-tabs a {\n  border-bottom: 1px solid hsl(0, 0%, 86%);\n  margin-bottom: -1px;\n  padding: 0.5em;\n}\n.panel-tabs a.is-active {\n  border-bottom-color: #363636;\n  color: #242424;\n}\n\n.panel-list a {\n  color: #363636;\n}\n.panel-list a:hover {\n  color: #3273dc;\n}\n\n.panel-block {\n  align-items: center;\n  color: #242424;\n  display: flex;\n  justify-content: flex-start;\n  padding: 0.5em 0.75em;\n}\n.panel-block input[type=checkbox] {\n  margin-right: 0.75em;\n}\n.panel-block > .control {\n  flex-grow: 1;\n  flex-shrink: 1;\n  width: 100%;\n}\n.panel-block.is-wrapped {\n  flex-wrap: wrap;\n}\n.panel-block.is-active {\n  border-left-color: #3273dc;\n  color: #242424;\n}\n.panel-block.is-active .panel-icon {\n  color: #3273dc;\n}\n.panel-block:last-child {\n  border-bottom-left-radius: 6px;\n  border-bottom-right-radius: 6px;\n}\n\na.panel-block,\nlabel.panel-block {\n  cursor: pointer;\n}\na.panel-block:hover,\nlabel.panel-block:hover {\n  background-color: hsl(0, 0%, 96%);\n}\n\n.panel-icon {\n  display: inline-block;\n  font-size: 14px;\n  height: 1em;\n  line-height: 1em;\n  text-align: center;\n  vertical-align: top;\n  width: 1em;\n  color: hsl(0, 0%, 48%);\n  margin-right: 0.75em;\n}\n.panel-icon .fa {\n  font-size: inherit;\n  line-height: inherit;\n}\n\n.tabs {\n  -webkit-overflow-scrolling: touch;\n  align-items: stretch;\n  display: flex;\n  font-size: 1rem;\n  justify-content: space-between;\n  overflow: hidden;\n  overflow-x: auto;\n  white-space: nowrap;\n}\n.tabs a {\n  align-items: center;\n  border-bottom-color: hsl(0, 0%, 86%);\n  border-bottom-style: solid;\n  border-bottom-width: 1px;\n  color: #363636;\n  display: flex;\n  justify-content: center;\n  margin-bottom: -1px;\n  padding: 0.5em 1em;\n  vertical-align: top;\n}\n.tabs a:hover {\n  border-bottom-color: #242424;\n  color: #242424;\n}\n.tabs li {\n  display: block;\n}\n.tabs li.is-active a {\n  border-bottom-color: #3273dc;\n  color: #3273dc;\n}\n.tabs ul {\n  align-items: center;\n  border-bottom-color: hsl(0, 0%, 86%);\n  border-bottom-style: solid;\n  border-bottom-width: 1px;\n  display: flex;\n  flex-grow: 1;\n  flex-shrink: 0;\n  justify-content: flex-start;\n}\n.tabs ul.is-left {\n  padding-right: 0.75em;\n}\n.tabs ul.is-center {\n  flex: none;\n  justify-content: center;\n  padding-left: 0.75em;\n  padding-right: 0.75em;\n}\n.tabs ul.is-right {\n  justify-content: flex-end;\n  padding-left: 0.75em;\n}\n.tabs .icon:first-child {\n  margin-right: 0.5em;\n}\n.tabs .icon:last-child {\n  margin-left: 0.5em;\n}\n.tabs.is-centered ul {\n  justify-content: center;\n}\n.tabs.is-right ul {\n  justify-content: flex-end;\n}\n.tabs.is-boxed a {\n  border: 1px solid transparent;\n  border-radius: 4px 4px 0 0;\n}\n.tabs.is-boxed a:hover {\n  background-color: hsl(0, 0%, 96%);\n  border-bottom-color: hsl(0, 0%, 86%);\n}\n.tabs.is-boxed li.is-active a {\n  background-color: hsl(0, 0%, 100%);\n  border-color: hsl(0, 0%, 86%);\n  border-bottom-color: transparent !important;\n}\n.tabs.is-fullwidth li {\n  flex-grow: 1;\n  flex-shrink: 0;\n}\n.tabs.is-toggle a {\n  border-color: hsl(0, 0%, 86%);\n  border-style: solid;\n  border-width: 1px;\n  margin-bottom: 0;\n  position: relative;\n}\n.tabs.is-toggle a:hover {\n  background-color: hsl(0, 0%, 96%);\n  border-color: #dbdbdb;\n  z-index: 2;\n}\n.tabs.is-toggle li + li {\n  margin-left: -1px;\n}\n.tabs.is-toggle li:first-child a {\n  border-top-left-radius: 4px;\n  border-bottom-left-radius: 4px;\n}\n.tabs.is-toggle li:last-child a {\n  border-top-right-radius: 4px;\n  border-bottom-right-radius: 4px;\n}\n.tabs.is-toggle li.is-active a {\n  background-color: #3273dc;\n  border-color: #3273dc;\n  color: #fff;\n  z-index: 1;\n}\n.tabs.is-toggle ul {\n  border-bottom: none;\n}\n.tabs.is-toggle.is-toggle-rounded li:first-child a {\n  border-bottom-left-radius: 9999px;\n  border-top-left-radius: 9999px;\n  padding-left: 1.25em;\n}\n.tabs.is-toggle.is-toggle-rounded li:last-child a {\n  border-bottom-right-radius: 9999px;\n  border-top-right-radius: 9999px;\n  padding-right: 1.25em;\n}\n.tabs.is-small {\n  font-size: 0.75rem;\n}\n.tabs.is-medium {\n  font-size: 1.25rem;\n}\n.tabs.is-large {\n  font-size: 1.5rem;\n}\n\n/* Bulma Grid */\n.column {\n  display: block;\n  flex-basis: 0;\n  flex-grow: 1;\n  flex-shrink: 1;\n  padding: 0.75rem;\n}\n.columns.is-mobile > .column.is-narrow {\n  flex: none;\n  width: unset;\n}\n.columns.is-mobile > .column.is-full {\n  flex: none;\n  width: 100%;\n}\n.columns.is-mobile > .column.is-three-quarters {\n  flex: none;\n  width: 75%;\n}\n.columns.is-mobile > .column.is-two-thirds {\n  flex: none;\n  width: 66.6666%;\n}\n.columns.is-mobile > .column.is-half {\n  flex: none;\n  width: 50%;\n}\n.columns.is-mobile > .column.is-one-third {\n  flex: none;\n  width: 33.3333%;\n}\n.columns.is-mobile > .column.is-one-quarter {\n  flex: none;\n  width: 25%;\n}\n.columns.is-mobile > .column.is-one-fifth {\n  flex: none;\n  width: 20%;\n}\n.columns.is-mobile > .column.is-two-fifths {\n  flex: none;\n  width: 40%;\n}\n.columns.is-mobile > .column.is-three-fifths {\n  flex: none;\n  width: 60%;\n}\n.columns.is-mobile > .column.is-four-fifths {\n  flex: none;\n  width: 80%;\n}\n.columns.is-mobile > .column.is-offset-three-quarters {\n  margin-left: 75%;\n}\n.columns.is-mobile > .column.is-offset-two-thirds {\n  margin-left: 66.6666%;\n}\n.columns.is-mobile > .column.is-offset-half {\n  margin-left: 50%;\n}\n.columns.is-mobile > .column.is-offset-one-third {\n  margin-left: 33.3333%;\n}\n.columns.is-mobile > .column.is-offset-one-quarter {\n  margin-left: 25%;\n}\n.columns.is-mobile > .column.is-offset-one-fifth {\n  margin-left: 20%;\n}\n.columns.is-mobile > .column.is-offset-two-fifths {\n  margin-left: 40%;\n}\n.columns.is-mobile > .column.is-offset-three-fifths {\n  margin-left: 60%;\n}\n.columns.is-mobile > .column.is-offset-four-fifths {\n  margin-left: 80%;\n}\n.columns.is-mobile > .column.is-0 {\n  flex: none;\n  width: 0%;\n}\n.columns.is-mobile > .column.is-offset-0 {\n  margin-left: 0%;\n}\n.columns.is-mobile > .column.is-1 {\n  flex: none;\n  width: 8.33333337%;\n}\n.columns.is-mobile > .column.is-offset-1 {\n  margin-left: 8.33333337%;\n}\n.columns.is-mobile > .column.is-2 {\n  flex: none;\n  width: 16.66666674%;\n}\n.columns.is-mobile > .column.is-offset-2 {\n  margin-left: 16.66666674%;\n}\n.columns.is-mobile > .column.is-3 {\n  flex: none;\n  width: 25%;\n}\n.columns.is-mobile > .column.is-offset-3 {\n  margin-left: 25%;\n}\n.columns.is-mobile > .column.is-4 {\n  flex: none;\n  width: 33.33333337%;\n}\n.columns.is-mobile > .column.is-offset-4 {\n  margin-left: 33.33333337%;\n}\n.columns.is-mobile > .column.is-5 {\n  flex: none;\n  width: 41.66666674%;\n}\n.columns.is-mobile > .column.is-offset-5 {\n  margin-left: 41.66666674%;\n}\n.columns.is-mobile > .column.is-6 {\n  flex: none;\n  width: 50%;\n}\n.columns.is-mobile > .column.is-offset-6 {\n  margin-left: 50%;\n}\n.columns.is-mobile > .column.is-7 {\n  flex: none;\n  width: 58.33333337%;\n}\n.columns.is-mobile > .column.is-offset-7 {\n  margin-left: 58.33333337%;\n}\n.columns.is-mobile > .column.is-8 {\n  flex: none;\n  width: 66.66666674%;\n}\n.columns.is-mobile > .column.is-offset-8 {\n  margin-left: 66.66666674%;\n}\n.columns.is-mobile > .column.is-9 {\n  flex: none;\n  width: 75%;\n}\n.columns.is-mobile > .column.is-offset-9 {\n  margin-left: 75%;\n}\n.columns.is-mobile > .column.is-10 {\n  flex: none;\n  width: 83.33333337%;\n}\n.columns.is-mobile > .column.is-offset-10 {\n  margin-left: 83.33333337%;\n}\n.columns.is-mobile > .column.is-11 {\n  flex: none;\n  width: 91.66666674%;\n}\n.columns.is-mobile > .column.is-offset-11 {\n  margin-left: 91.66666674%;\n}\n.columns.is-mobile > .column.is-12 {\n  flex: none;\n  width: 100%;\n}\n.columns.is-mobile > .column.is-offset-12 {\n  margin-left: 100%;\n}\n@media screen and (max-width: 768px) {\n  .column.is-narrow-mobile {\n    flex: none;\n    width: unset;\n  }\n  .column.is-full-mobile {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-three-quarters-mobile {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-two-thirds-mobile {\n    flex: none;\n    width: 66.6666%;\n  }\n  .column.is-half-mobile {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-one-third-mobile {\n    flex: none;\n    width: 33.3333%;\n  }\n  .column.is-one-quarter-mobile {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-one-fifth-mobile {\n    flex: none;\n    width: 20%;\n  }\n  .column.is-two-fifths-mobile {\n    flex: none;\n    width: 40%;\n  }\n  .column.is-three-fifths-mobile {\n    flex: none;\n    width: 60%;\n  }\n  .column.is-four-fifths-mobile {\n    flex: none;\n    width: 80%;\n  }\n  .column.is-offset-three-quarters-mobile {\n    margin-left: 75%;\n  }\n  .column.is-offset-two-thirds-mobile {\n    margin-left: 66.6666%;\n  }\n  .column.is-offset-half-mobile {\n    margin-left: 50%;\n  }\n  .column.is-offset-one-third-mobile {\n    margin-left: 33.3333%;\n  }\n  .column.is-offset-one-quarter-mobile {\n    margin-left: 25%;\n  }\n  .column.is-offset-one-fifth-mobile {\n    margin-left: 20%;\n  }\n  .column.is-offset-two-fifths-mobile {\n    margin-left: 40%;\n  }\n  .column.is-offset-three-fifths-mobile {\n    margin-left: 60%;\n  }\n  .column.is-offset-four-fifths-mobile {\n    margin-left: 80%;\n  }\n  .column.is-0-mobile {\n    flex: none;\n    width: 0%;\n  }\n  .column.is-offset-0-mobile {\n    margin-left: 0%;\n  }\n  .column.is-1-mobile {\n    flex: none;\n    width: 8.33333337%;\n  }\n  .column.is-offset-1-mobile {\n    margin-left: 8.33333337%;\n  }\n  .column.is-2-mobile {\n    flex: none;\n    width: 16.66666674%;\n  }\n  .column.is-offset-2-mobile {\n    margin-left: 16.66666674%;\n  }\n  .column.is-3-mobile {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-offset-3-mobile {\n    margin-left: 25%;\n  }\n  .column.is-4-mobile {\n    flex: none;\n    width: 33.33333337%;\n  }\n  .column.is-offset-4-mobile {\n    margin-left: 33.33333337%;\n  }\n  .column.is-5-mobile {\n    flex: none;\n    width: 41.66666674%;\n  }\n  .column.is-offset-5-mobile {\n    margin-left: 41.66666674%;\n  }\n  .column.is-6-mobile {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-offset-6-mobile {\n    margin-left: 50%;\n  }\n  .column.is-7-mobile {\n    flex: none;\n    width: 58.33333337%;\n  }\n  .column.is-offset-7-mobile {\n    margin-left: 58.33333337%;\n  }\n  .column.is-8-mobile {\n    flex: none;\n    width: 66.66666674%;\n  }\n  .column.is-offset-8-mobile {\n    margin-left: 66.66666674%;\n  }\n  .column.is-9-mobile {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-offset-9-mobile {\n    margin-left: 75%;\n  }\n  .column.is-10-mobile {\n    flex: none;\n    width: 83.33333337%;\n  }\n  .column.is-offset-10-mobile {\n    margin-left: 83.33333337%;\n  }\n  .column.is-11-mobile {\n    flex: none;\n    width: 91.66666674%;\n  }\n  .column.is-offset-11-mobile {\n    margin-left: 91.66666674%;\n  }\n  .column.is-12-mobile {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-offset-12-mobile {\n    margin-left: 100%;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .column.is-narrow, .column.is-narrow-tablet {\n    flex: none;\n    width: unset;\n  }\n  .column.is-full, .column.is-full-tablet {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-three-quarters, .column.is-three-quarters-tablet {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-two-thirds, .column.is-two-thirds-tablet {\n    flex: none;\n    width: 66.6666%;\n  }\n  .column.is-half, .column.is-half-tablet {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-one-third, .column.is-one-third-tablet {\n    flex: none;\n    width: 33.3333%;\n  }\n  .column.is-one-quarter, .column.is-one-quarter-tablet {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-one-fifth, .column.is-one-fifth-tablet {\n    flex: none;\n    width: 20%;\n  }\n  .column.is-two-fifths, .column.is-two-fifths-tablet {\n    flex: none;\n    width: 40%;\n  }\n  .column.is-three-fifths, .column.is-three-fifths-tablet {\n    flex: none;\n    width: 60%;\n  }\n  .column.is-four-fifths, .column.is-four-fifths-tablet {\n    flex: none;\n    width: 80%;\n  }\n  .column.is-offset-three-quarters, .column.is-offset-three-quarters-tablet {\n    margin-left: 75%;\n  }\n  .column.is-offset-two-thirds, .column.is-offset-two-thirds-tablet {\n    margin-left: 66.6666%;\n  }\n  .column.is-offset-half, .column.is-offset-half-tablet {\n    margin-left: 50%;\n  }\n  .column.is-offset-one-third, .column.is-offset-one-third-tablet {\n    margin-left: 33.3333%;\n  }\n  .column.is-offset-one-quarter, .column.is-offset-one-quarter-tablet {\n    margin-left: 25%;\n  }\n  .column.is-offset-one-fifth, .column.is-offset-one-fifth-tablet {\n    margin-left: 20%;\n  }\n  .column.is-offset-two-fifths, .column.is-offset-two-fifths-tablet {\n    margin-left: 40%;\n  }\n  .column.is-offset-three-fifths, .column.is-offset-three-fifths-tablet {\n    margin-left: 60%;\n  }\n  .column.is-offset-four-fifths, .column.is-offset-four-fifths-tablet {\n    margin-left: 80%;\n  }\n  .column.is-0, .column.is-0-tablet {\n    flex: none;\n    width: 0%;\n  }\n  .column.is-offset-0, .column.is-offset-0-tablet {\n    margin-left: 0%;\n  }\n  .column.is-1, .column.is-1-tablet {\n    flex: none;\n    width: 8.33333337%;\n  }\n  .column.is-offset-1, .column.is-offset-1-tablet {\n    margin-left: 8.33333337%;\n  }\n  .column.is-2, .column.is-2-tablet {\n    flex: none;\n    width: 16.66666674%;\n  }\n  .column.is-offset-2, .column.is-offset-2-tablet {\n    margin-left: 16.66666674%;\n  }\n  .column.is-3, .column.is-3-tablet {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-offset-3, .column.is-offset-3-tablet {\n    margin-left: 25%;\n  }\n  .column.is-4, .column.is-4-tablet {\n    flex: none;\n    width: 33.33333337%;\n  }\n  .column.is-offset-4, .column.is-offset-4-tablet {\n    margin-left: 33.33333337%;\n  }\n  .column.is-5, .column.is-5-tablet {\n    flex: none;\n    width: 41.66666674%;\n  }\n  .column.is-offset-5, .column.is-offset-5-tablet {\n    margin-left: 41.66666674%;\n  }\n  .column.is-6, .column.is-6-tablet {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-offset-6, .column.is-offset-6-tablet {\n    margin-left: 50%;\n  }\n  .column.is-7, .column.is-7-tablet {\n    flex: none;\n    width: 58.33333337%;\n  }\n  .column.is-offset-7, .column.is-offset-7-tablet {\n    margin-left: 58.33333337%;\n  }\n  .column.is-8, .column.is-8-tablet {\n    flex: none;\n    width: 66.66666674%;\n  }\n  .column.is-offset-8, .column.is-offset-8-tablet {\n    margin-left: 66.66666674%;\n  }\n  .column.is-9, .column.is-9-tablet {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-offset-9, .column.is-offset-9-tablet {\n    margin-left: 75%;\n  }\n  .column.is-10, .column.is-10-tablet {\n    flex: none;\n    width: 83.33333337%;\n  }\n  .column.is-offset-10, .column.is-offset-10-tablet {\n    margin-left: 83.33333337%;\n  }\n  .column.is-11, .column.is-11-tablet {\n    flex: none;\n    width: 91.66666674%;\n  }\n  .column.is-offset-11, .column.is-offset-11-tablet {\n    margin-left: 91.66666674%;\n  }\n  .column.is-12, .column.is-12-tablet {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-offset-12, .column.is-offset-12-tablet {\n    margin-left: 100%;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .column.is-narrow-touch {\n    flex: none;\n    width: unset;\n  }\n  .column.is-full-touch {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-three-quarters-touch {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-two-thirds-touch {\n    flex: none;\n    width: 66.6666%;\n  }\n  .column.is-half-touch {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-one-third-touch {\n    flex: none;\n    width: 33.3333%;\n  }\n  .column.is-one-quarter-touch {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-one-fifth-touch {\n    flex: none;\n    width: 20%;\n  }\n  .column.is-two-fifths-touch {\n    flex: none;\n    width: 40%;\n  }\n  .column.is-three-fifths-touch {\n    flex: none;\n    width: 60%;\n  }\n  .column.is-four-fifths-touch {\n    flex: none;\n    width: 80%;\n  }\n  .column.is-offset-three-quarters-touch {\n    margin-left: 75%;\n  }\n  .column.is-offset-two-thirds-touch {\n    margin-left: 66.6666%;\n  }\n  .column.is-offset-half-touch {\n    margin-left: 50%;\n  }\n  .column.is-offset-one-third-touch {\n    margin-left: 33.3333%;\n  }\n  .column.is-offset-one-quarter-touch {\n    margin-left: 25%;\n  }\n  .column.is-offset-one-fifth-touch {\n    margin-left: 20%;\n  }\n  .column.is-offset-two-fifths-touch {\n    margin-left: 40%;\n  }\n  .column.is-offset-three-fifths-touch {\n    margin-left: 60%;\n  }\n  .column.is-offset-four-fifths-touch {\n    margin-left: 80%;\n  }\n  .column.is-0-touch {\n    flex: none;\n    width: 0%;\n  }\n  .column.is-offset-0-touch {\n    margin-left: 0%;\n  }\n  .column.is-1-touch {\n    flex: none;\n    width: 8.33333337%;\n  }\n  .column.is-offset-1-touch {\n    margin-left: 8.33333337%;\n  }\n  .column.is-2-touch {\n    flex: none;\n    width: 16.66666674%;\n  }\n  .column.is-offset-2-touch {\n    margin-left: 16.66666674%;\n  }\n  .column.is-3-touch {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-offset-3-touch {\n    margin-left: 25%;\n  }\n  .column.is-4-touch {\n    flex: none;\n    width: 33.33333337%;\n  }\n  .column.is-offset-4-touch {\n    margin-left: 33.33333337%;\n  }\n  .column.is-5-touch {\n    flex: none;\n    width: 41.66666674%;\n  }\n  .column.is-offset-5-touch {\n    margin-left: 41.66666674%;\n  }\n  .column.is-6-touch {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-offset-6-touch {\n    margin-left: 50%;\n  }\n  .column.is-7-touch {\n    flex: none;\n    width: 58.33333337%;\n  }\n  .column.is-offset-7-touch {\n    margin-left: 58.33333337%;\n  }\n  .column.is-8-touch {\n    flex: none;\n    width: 66.66666674%;\n  }\n  .column.is-offset-8-touch {\n    margin-left: 66.66666674%;\n  }\n  .column.is-9-touch {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-offset-9-touch {\n    margin-left: 75%;\n  }\n  .column.is-10-touch {\n    flex: none;\n    width: 83.33333337%;\n  }\n  .column.is-offset-10-touch {\n    margin-left: 83.33333337%;\n  }\n  .column.is-11-touch {\n    flex: none;\n    width: 91.66666674%;\n  }\n  .column.is-offset-11-touch {\n    margin-left: 91.66666674%;\n  }\n  .column.is-12-touch {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-offset-12-touch {\n    margin-left: 100%;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .column.is-narrow-desktop {\n    flex: none;\n    width: unset;\n  }\n  .column.is-full-desktop {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-three-quarters-desktop {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-two-thirds-desktop {\n    flex: none;\n    width: 66.6666%;\n  }\n  .column.is-half-desktop {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-one-third-desktop {\n    flex: none;\n    width: 33.3333%;\n  }\n  .column.is-one-quarter-desktop {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-one-fifth-desktop {\n    flex: none;\n    width: 20%;\n  }\n  .column.is-two-fifths-desktop {\n    flex: none;\n    width: 40%;\n  }\n  .column.is-three-fifths-desktop {\n    flex: none;\n    width: 60%;\n  }\n  .column.is-four-fifths-desktop {\n    flex: none;\n    width: 80%;\n  }\n  .column.is-offset-three-quarters-desktop {\n    margin-left: 75%;\n  }\n  .column.is-offset-two-thirds-desktop {\n    margin-left: 66.6666%;\n  }\n  .column.is-offset-half-desktop {\n    margin-left: 50%;\n  }\n  .column.is-offset-one-third-desktop {\n    margin-left: 33.3333%;\n  }\n  .column.is-offset-one-quarter-desktop {\n    margin-left: 25%;\n  }\n  .column.is-offset-one-fifth-desktop {\n    margin-left: 20%;\n  }\n  .column.is-offset-two-fifths-desktop {\n    margin-left: 40%;\n  }\n  .column.is-offset-three-fifths-desktop {\n    margin-left: 60%;\n  }\n  .column.is-offset-four-fifths-desktop {\n    margin-left: 80%;\n  }\n  .column.is-0-desktop {\n    flex: none;\n    width: 0%;\n  }\n  .column.is-offset-0-desktop {\n    margin-left: 0%;\n  }\n  .column.is-1-desktop {\n    flex: none;\n    width: 8.33333337%;\n  }\n  .column.is-offset-1-desktop {\n    margin-left: 8.33333337%;\n  }\n  .column.is-2-desktop {\n    flex: none;\n    width: 16.66666674%;\n  }\n  .column.is-offset-2-desktop {\n    margin-left: 16.66666674%;\n  }\n  .column.is-3-desktop {\n    flex: none;\n    width: 25%;\n  }\n  .column.is-offset-3-desktop {\n    margin-left: 25%;\n  }\n  .column.is-4-desktop {\n    flex: none;\n    width: 33.33333337%;\n  }\n  .column.is-offset-4-desktop {\n    margin-left: 33.33333337%;\n  }\n  .column.is-5-desktop {\n    flex: none;\n    width: 41.66666674%;\n  }\n  .column.is-offset-5-desktop {\n    margin-left: 41.66666674%;\n  }\n  .column.is-6-desktop {\n    flex: none;\n    width: 50%;\n  }\n  .column.is-offset-6-desktop {\n    margin-left: 50%;\n  }\n  .column.is-7-desktop {\n    flex: none;\n    width: 58.33333337%;\n  }\n  .column.is-offset-7-desktop {\n    margin-left: 58.33333337%;\n  }\n  .column.is-8-desktop {\n    flex: none;\n    width: 66.66666674%;\n  }\n  .column.is-offset-8-desktop {\n    margin-left: 66.66666674%;\n  }\n  .column.is-9-desktop {\n    flex: none;\n    width: 75%;\n  }\n  .column.is-offset-9-desktop {\n    margin-left: 75%;\n  }\n  .column.is-10-desktop {\n    flex: none;\n    width: 83.33333337%;\n  }\n  .column.is-offset-10-desktop {\n    margin-left: 83.33333337%;\n  }\n  .column.is-11-desktop {\n    flex: none;\n    width: 91.66666674%;\n  }\n  .column.is-offset-11-desktop {\n    margin-left: 91.66666674%;\n  }\n  .column.is-12-desktop {\n    flex: none;\n    width: 100%;\n  }\n  .column.is-offset-12-desktop {\n    margin-left: 100%;\n  }\n}\n\n.columns {\n  margin-left: -0.75rem;\n  margin-right: -0.75rem;\n  margin-top: -0.75rem;\n}\n.columns:last-child {\n  margin-bottom: -0.75rem;\n}\n.columns:not(:last-child) {\n  margin-bottom: calc(1.5rem - 0.75rem);\n}\n.columns.is-centered {\n  justify-content: center;\n}\n.columns.is-gapless {\n  margin-left: 0;\n  margin-right: 0;\n  margin-top: 0;\n}\n.columns.is-gapless > .column {\n  margin: 0;\n  padding: 0 !important;\n}\n.columns.is-gapless:not(:last-child) {\n  margin-bottom: 1.5rem;\n}\n.columns.is-gapless:last-child {\n  margin-bottom: 0;\n}\n.columns.is-mobile {\n  display: flex;\n}\n.columns.is-multiline {\n  flex-wrap: wrap;\n}\n.columns.is-vcentered {\n  align-items: center;\n}\n@media screen and (min-width: 769px), print {\n  .columns:not(.is-desktop) {\n    display: flex;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-desktop {\n    display: flex;\n  }\n}\n\n.columns.is-variable {\n  --columnGap: 0.75rem;\n  margin-left: calc(-1 * var(--columnGap));\n  margin-right: calc(-1 * var(--columnGap));\n}\n.columns.is-variable > .column {\n  padding-left: var(--columnGap);\n  padding-right: var(--columnGap);\n}\n.columns.is-variable.is-0 {\n  --columnGap: 0rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-0-mobile {\n    --columnGap: 0rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-0-tablet {\n    --columnGap: 0rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-0-tablet-only {\n    --columnGap: 0rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-0-touch {\n    --columnGap: 0rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-0-desktop {\n    --columnGap: 0rem;\n  }\n}\n.columns.is-variable.is-1 {\n  --columnGap: 0.25rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-1-mobile {\n    --columnGap: 0.25rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-1-tablet {\n    --columnGap: 0.25rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-1-tablet-only {\n    --columnGap: 0.25rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-1-touch {\n    --columnGap: 0.25rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-1-desktop {\n    --columnGap: 0.25rem;\n  }\n}\n.columns.is-variable.is-2 {\n  --columnGap: 0.5rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-2-mobile {\n    --columnGap: 0.5rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-2-tablet {\n    --columnGap: 0.5rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-2-tablet-only {\n    --columnGap: 0.5rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-2-touch {\n    --columnGap: 0.5rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-2-desktop {\n    --columnGap: 0.5rem;\n  }\n}\n.columns.is-variable.is-3 {\n  --columnGap: 0.75rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-3-mobile {\n    --columnGap: 0.75rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-3-tablet {\n    --columnGap: 0.75rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-3-tablet-only {\n    --columnGap: 0.75rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-3-touch {\n    --columnGap: 0.75rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-3-desktop {\n    --columnGap: 0.75rem;\n  }\n}\n.columns.is-variable.is-4 {\n  --columnGap: 1rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-4-mobile {\n    --columnGap: 1rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-4-tablet {\n    --columnGap: 1rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-4-tablet-only {\n    --columnGap: 1rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-4-touch {\n    --columnGap: 1rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-4-desktop {\n    --columnGap: 1rem;\n  }\n}\n.columns.is-variable.is-5 {\n  --columnGap: 1.25rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-5-mobile {\n    --columnGap: 1.25rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-5-tablet {\n    --columnGap: 1.25rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-5-tablet-only {\n    --columnGap: 1.25rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-5-touch {\n    --columnGap: 1.25rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-5-desktop {\n    --columnGap: 1.25rem;\n  }\n}\n.columns.is-variable.is-6 {\n  --columnGap: 1.5rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-6-mobile {\n    --columnGap: 1.5rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-6-tablet {\n    --columnGap: 1.5rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-6-tablet-only {\n    --columnGap: 1.5rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-6-touch {\n    --columnGap: 1.5rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-6-desktop {\n    --columnGap: 1.5rem;\n  }\n}\n.columns.is-variable.is-7 {\n  --columnGap: 1.75rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-7-mobile {\n    --columnGap: 1.75rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-7-tablet {\n    --columnGap: 1.75rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-7-tablet-only {\n    --columnGap: 1.75rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-7-touch {\n    --columnGap: 1.75rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-7-desktop {\n    --columnGap: 1.75rem;\n  }\n}\n.columns.is-variable.is-8 {\n  --columnGap: 2rem;\n}\n@media screen and (max-width: 768px) {\n  .columns.is-variable.is-8-mobile {\n    --columnGap: 2rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .columns.is-variable.is-8-tablet {\n    --columnGap: 2rem;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .columns.is-variable.is-8-tablet-only {\n    --columnGap: 2rem;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .columns.is-variable.is-8-touch {\n    --columnGap: 2rem;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .columns.is-variable.is-8-desktop {\n    --columnGap: 2rem;\n  }\n}\n\n.tile {\n  align-items: stretch;\n  display: block;\n  flex-basis: 0;\n  flex-grow: 1;\n  flex-shrink: 1;\n  min-height: min-content;\n}\n.tile.is-ancestor {\n  margin-left: -0.75rem;\n  margin-right: -0.75rem;\n  margin-top: -0.75rem;\n}\n.tile.is-ancestor:last-child {\n  margin-bottom: -0.75rem;\n}\n.tile.is-ancestor:not(:last-child) {\n  margin-bottom: 0.75rem;\n}\n.tile.is-child {\n  margin: 0 !important;\n}\n.tile.is-parent {\n  padding: 0.75rem;\n}\n.tile.is-vertical {\n  flex-direction: column;\n}\n.tile.is-vertical > .tile.is-child:not(:last-child) {\n  margin-bottom: 1.5rem !important;\n}\n@media screen and (min-width: 769px), print {\n  .tile:not(.is-child) {\n    display: flex;\n  }\n  .tile.is-1 {\n    flex: none;\n    width: 8.33333337%;\n  }\n  .tile.is-2 {\n    flex: none;\n    width: 16.66666674%;\n  }\n  .tile.is-3 {\n    flex: none;\n    width: 25%;\n  }\n  .tile.is-4 {\n    flex: none;\n    width: 33.33333337%;\n  }\n  .tile.is-5 {\n    flex: none;\n    width: 41.66666674%;\n  }\n  .tile.is-6 {\n    flex: none;\n    width: 50%;\n  }\n  .tile.is-7 {\n    flex: none;\n    width: 58.33333337%;\n  }\n  .tile.is-8 {\n    flex: none;\n    width: 66.66666674%;\n  }\n  .tile.is-9 {\n    flex: none;\n    width: 75%;\n  }\n  .tile.is-10 {\n    flex: none;\n    width: 83.33333337%;\n  }\n  .tile.is-11 {\n    flex: none;\n    width: 91.66666674%;\n  }\n  .tile.is-12 {\n    flex: none;\n    width: 100%;\n  }\n}\n\n/* Bulma Helpers */\n.has-text-white {\n  color: hsl(0, 0%, 100%) !important;\n}\n\na.has-text-white:hover, a.has-text-white:focus {\n  color: #e6e6e6 !important;\n}\n\n.has-background-white {\n  background-color: hsl(0, 0%, 100%) !important;\n}\n\n.has-text-black {\n  color: hsl(0, 0%, 4%) !important;\n}\n\na.has-text-black:hover, a.has-text-black:focus {\n  color: black !important;\n}\n\n.has-background-black {\n  background-color: hsl(0, 0%, 4%) !important;\n}\n\n.has-text-light {\n  color: hsl(0, 0%, 96%) !important;\n}\n\na.has-text-light:hover, a.has-text-light:focus {\n  color: #dbdbdb !important;\n}\n\n.has-background-light {\n  background-color: hsl(0, 0%, 96%) !important;\n}\n\n.has-text-dark {\n  color: #242424 !important;\n}\n\na.has-text-dark:hover, a.has-text-dark:focus {\n  color: #0b0b0b !important;\n}\n\n.has-background-dark {\n  background-color: #242424 !important;\n}\n\n.has-text-primary {\n  color: #00d1b2 !important;\n}\n\na.has-text-primary:hover, a.has-text-primary:focus {\n  color: #009e87 !important;\n}\n\n.has-background-primary {\n  background-color: #00d1b2 !important;\n}\n\n.has-text-primary-light {\n  color: #ebfffc !important;\n}\n\na.has-text-primary-light:hover, a.has-text-primary-light:focus {\n  color: #b8fff4 !important;\n}\n\n.has-background-primary-light {\n  background-color: #ebfffc !important;\n}\n\n.has-text-primary-dark {\n  color: #00947e !important;\n}\n\na.has-text-primary-dark:hover, a.has-text-primary-dark:focus {\n  color: #00c7a9 !important;\n}\n\n.has-background-primary-dark {\n  background-color: #00947e !important;\n}\n\n.has-text-link {\n  color: #3273dc !important;\n}\n\na.has-text-link:hover, a.has-text-link:focus {\n  color: #205bbb !important;\n}\n\n.has-background-link {\n  background-color: #3273dc !important;\n}\n\n.has-text-link-light {\n  color: #eef3fc !important;\n}\n\na.has-text-link-light:hover, a.has-text-link-light:focus {\n  color: #c2d5f5 !important;\n}\n\n.has-background-link-light {\n  background-color: #eef3fc !important;\n}\n\n.has-text-link-dark {\n  color: #2160c4 !important;\n}\n\na.has-text-link-dark:hover, a.has-text-link-dark:focus {\n  color: #3b79de !important;\n}\n\n.has-background-link-dark {\n  background-color: #2160c4 !important;\n}\n\n.has-text-info {\n  color: hsl(207, 61%, 53%) !important;\n}\n\na.has-text-info:hover, a.has-text-info:focus {\n  color: #2b74b1 !important;\n}\n\n.has-background-info {\n  background-color: hsl(207, 61%, 53%) !important;\n}\n\n.has-text-info-light {\n  color: #eff5fb !important;\n}\n\na.has-text-info-light:hover, a.has-text-info-light:focus {\n  color: #c6ddf1 !important;\n}\n\n.has-background-info-light {\n  background-color: #eff5fb !important;\n}\n\n.has-text-info-dark {\n  color: #296fa8 !important;\n}\n\na.has-text-info-dark:hover, a.has-text-info-dark:focus {\n  color: #368ace !important;\n}\n\n.has-background-info-dark {\n  background-color: #296fa8 !important;\n}\n\n.has-text-success {\n  color: hsl(153, 53%, 53%) !important;\n}\n\na.has-text-success:hover, a.has-text-success:focus {\n  color: #34a873 !important;\n}\n\n.has-background-success {\n  background-color: hsl(153, 53%, 53%) !important;\n}\n\n.has-text-success-light {\n  color: #effaf5 !important;\n}\n\na.has-text-success-light:hover, a.has-text-success-light:focus {\n  color: #c8eedd !important;\n}\n\n.has-background-success-light {\n  background-color: #effaf5 !important;\n}\n\n.has-text-success-dark {\n  color: #257953 !important;\n}\n\na.has-text-success-dark:hover, a.has-text-success-dark:focus {\n  color: #31a06e !important;\n}\n\n.has-background-success-dark {\n  background-color: #257953 !important;\n}\n\n.has-text-warning {\n  color: hsl(44, 100%, 77%) !important;\n}\n\na.has-text-warning:hover, a.has-text-warning:focus {\n  color: #ffd257 !important;\n}\n\n.has-background-warning {\n  background-color: hsl(44, 100%, 77%) !important;\n}\n\n.has-text-warning-light {\n  color: #fffaeb !important;\n}\n\na.has-text-warning-light:hover, a.has-text-warning-light:focus {\n  color: #ffecb8 !important;\n}\n\n.has-background-warning-light {\n  background-color: #fffaeb !important;\n}\n\n.has-text-warning-dark {\n  color: #946c00 !important;\n}\n\na.has-text-warning-dark:hover, a.has-text-warning-dark:focus {\n  color: #c79200 !important;\n}\n\n.has-background-warning-dark {\n  background-color: #946c00 !important;\n}\n\n.has-text-danger {\n  color: hsl(348, 86%, 61%) !important;\n}\n\na.has-text-danger:hover, a.has-text-danger:focus {\n  color: #ee1742 !important;\n}\n\n.has-background-danger {\n  background-color: hsl(348, 86%, 61%) !important;\n}\n\n.has-text-danger-light {\n  color: #feecf0 !important;\n}\n\na.has-text-danger-light:hover, a.has-text-danger-light:focus {\n  color: #fabdc9 !important;\n}\n\n.has-background-danger-light {\n  background-color: #feecf0 !important;\n}\n\n.has-text-danger-dark {\n  color: #cc0f35 !important;\n}\n\na.has-text-danger-dark:hover, a.has-text-danger-dark:focus {\n  color: #ee2049 !important;\n}\n\n.has-background-danger-dark {\n  background-color: #cc0f35 !important;\n}\n\n.has-text-black-bis {\n  color: hsl(0, 0%, 7%) !important;\n}\n\n.has-background-black-bis {\n  background-color: hsl(0, 0%, 7%) !important;\n}\n\n.has-text-black-ter {\n  color: hsl(0, 0%, 14%) !important;\n}\n\n.has-background-black-ter {\n  background-color: hsl(0, 0%, 14%) !important;\n}\n\n.has-text-grey-darker {\n  color: #242424 !important;\n}\n\n.has-background-grey-darker {\n  background-color: #242424 !important;\n}\n\n.has-text-grey-dark {\n  color: #363636 !important;\n}\n\n.has-background-grey-dark {\n  background-color: #363636 !important;\n}\n\n.has-text-grey {\n  color: hsl(0, 0%, 48%) !important;\n}\n\n.has-background-grey {\n  background-color: hsl(0, 0%, 48%) !important;\n}\n\n.has-text-grey-light {\n  color: #dbdbdb !important;\n}\n\n.has-background-grey-light {\n  background-color: #dbdbdb !important;\n}\n\n.has-text-grey-lighter {\n  color: hsl(0, 0%, 86%) !important;\n}\n\n.has-background-grey-lighter {\n  background-color: hsl(0, 0%, 86%) !important;\n}\n\n.has-text-white-ter {\n  color: hsl(0, 0%, 96%) !important;\n}\n\n.has-background-white-ter {\n  background-color: hsl(0, 0%, 96%) !important;\n}\n\n.has-text-white-bis {\n  color: hsl(0, 0%, 98%) !important;\n}\n\n.has-background-white-bis {\n  background-color: hsl(0, 0%, 98%) !important;\n}\n\n.is-flex-direction-row {\n  flex-direction: row !important;\n}\n\n.is-flex-direction-row-reverse {\n  flex-direction: row-reverse !important;\n}\n\n.is-flex-direction-column {\n  flex-direction: column !important;\n}\n\n.is-flex-direction-column-reverse {\n  flex-direction: column-reverse !important;\n}\n\n.is-flex-wrap-nowrap {\n  flex-wrap: nowrap !important;\n}\n\n.is-flex-wrap-wrap {\n  flex-wrap: wrap !important;\n}\n\n.is-flex-wrap-wrap-reverse {\n  flex-wrap: wrap-reverse !important;\n}\n\n.is-justify-content-flex-start {\n  justify-content: flex-start !important;\n}\n\n.is-justify-content-flex-end {\n  justify-content: flex-end !important;\n}\n\n.is-justify-content-center {\n  justify-content: center !important;\n}\n\n.is-justify-content-space-between {\n  justify-content: space-between !important;\n}\n\n.is-justify-content-space-around {\n  justify-content: space-around !important;\n}\n\n.is-justify-content-space-evenly {\n  justify-content: space-evenly !important;\n}\n\n.is-justify-content-start {\n  justify-content: start !important;\n}\n\n.is-justify-content-end {\n  justify-content: end !important;\n}\n\n.is-justify-content-left {\n  justify-content: left !important;\n}\n\n.is-justify-content-right {\n  justify-content: right !important;\n}\n\n.is-align-content-flex-start {\n  align-content: flex-start !important;\n}\n\n.is-align-content-flex-end {\n  align-content: flex-end !important;\n}\n\n.is-align-content-center {\n  align-content: center !important;\n}\n\n.is-align-content-space-between {\n  align-content: space-between !important;\n}\n\n.is-align-content-space-around {\n  align-content: space-around !important;\n}\n\n.is-align-content-space-evenly {\n  align-content: space-evenly !important;\n}\n\n.is-align-content-stretch {\n  align-content: stretch !important;\n}\n\n.is-align-content-start {\n  align-content: start !important;\n}\n\n.is-align-content-end {\n  align-content: end !important;\n}\n\n.is-align-content-baseline {\n  align-content: baseline !important;\n}\n\n.is-align-items-stretch {\n  align-items: stretch !important;\n}\n\n.is-align-items-flex-start {\n  align-items: flex-start !important;\n}\n\n.is-align-items-flex-end {\n  align-items: flex-end !important;\n}\n\n.is-align-items-center {\n  align-items: center !important;\n}\n\n.is-align-items-baseline {\n  align-items: baseline !important;\n}\n\n.is-align-items-start {\n  align-items: start !important;\n}\n\n.is-align-items-end {\n  align-items: end !important;\n}\n\n.is-align-items-self-start {\n  align-items: self-start !important;\n}\n\n.is-align-items-self-end {\n  align-items: self-end !important;\n}\n\n.is-align-self-auto {\n  align-self: auto !important;\n}\n\n.is-align-self-flex-start {\n  align-self: flex-start !important;\n}\n\n.is-align-self-flex-end {\n  align-self: flex-end !important;\n}\n\n.is-align-self-center {\n  align-self: center !important;\n}\n\n.is-align-self-baseline {\n  align-self: baseline !important;\n}\n\n.is-align-self-stretch {\n  align-self: stretch !important;\n}\n\n.is-flex-grow-0 {\n  flex-grow: 0 !important;\n}\n\n.is-flex-grow-1 {\n  flex-grow: 1 !important;\n}\n\n.is-flex-grow-2 {\n  flex-grow: 2 !important;\n}\n\n.is-flex-grow-3 {\n  flex-grow: 3 !important;\n}\n\n.is-flex-grow-4 {\n  flex-grow: 4 !important;\n}\n\n.is-flex-grow-5 {\n  flex-grow: 5 !important;\n}\n\n.is-flex-shrink-0 {\n  flex-shrink: 0 !important;\n}\n\n.is-flex-shrink-1 {\n  flex-shrink: 1 !important;\n}\n\n.is-flex-shrink-2 {\n  flex-shrink: 2 !important;\n}\n\n.is-flex-shrink-3 {\n  flex-shrink: 3 !important;\n}\n\n.is-flex-shrink-4 {\n  flex-shrink: 4 !important;\n}\n\n.is-flex-shrink-5 {\n  flex-shrink: 5 !important;\n}\n\n.is-clearfix::after {\n  clear: both;\n  content: \" \";\n  display: table;\n}\n\n.is-pulled-left {\n  float: left !important;\n}\n\n.is-pulled-right {\n  float: right !important;\n}\n\n.is-radiusless {\n  border-radius: 0 !important;\n}\n\n.is-shadowless {\n  box-shadow: none !important;\n}\n\n.is-clickable {\n  cursor: pointer !important;\n  pointer-events: all !important;\n}\n\n.is-clipped {\n  overflow: hidden !important;\n}\n\n.is-relative {\n  position: relative !important;\n}\n\n.is-marginless {\n  margin: 0 !important;\n}\n\n.is-paddingless {\n  padding: 0 !important;\n}\n\n.m-0 {\n  margin: 0 !important;\n}\n\n.mt-0 {\n  margin-top: 0 !important;\n}\n\n.mr-0 {\n  margin-right: 0 !important;\n}\n\n.mb-0 {\n  margin-bottom: 0 !important;\n}\n\n.ml-0 {\n  margin-left: 0 !important;\n}\n\n.mx-0 {\n  margin-left: 0 !important;\n  margin-right: 0 !important;\n}\n\n.my-0 {\n  margin-top: 0 !important;\n  margin-bottom: 0 !important;\n}\n\n.m-1 {\n  margin: 0.25rem !important;\n}\n\n.mt-1 {\n  margin-top: 0.25rem !important;\n}\n\n.mr-1 {\n  margin-right: 0.25rem !important;\n}\n\n.mb-1 {\n  margin-bottom: 0.25rem !important;\n}\n\n.ml-1 {\n  margin-left: 0.25rem !important;\n}\n\n.mx-1 {\n  margin-left: 0.25rem !important;\n  margin-right: 0.25rem !important;\n}\n\n.my-1 {\n  margin-top: 0.25rem !important;\n  margin-bottom: 0.25rem !important;\n}\n\n.m-2 {\n  margin: 0.5rem !important;\n}\n\n.mt-2 {\n  margin-top: 0.5rem !important;\n}\n\n.mr-2 {\n  margin-right: 0.5rem !important;\n}\n\n.mb-2 {\n  margin-bottom: 0.5rem !important;\n}\n\n.ml-2 {\n  margin-left: 0.5rem !important;\n}\n\n.mx-2 {\n  margin-left: 0.5rem !important;\n  margin-right: 0.5rem !important;\n}\n\n.my-2 {\n  margin-top: 0.5rem !important;\n  margin-bottom: 0.5rem !important;\n}\n\n.m-3 {\n  margin: 0.75rem !important;\n}\n\n.mt-3 {\n  margin-top: 0.75rem !important;\n}\n\n.mr-3 {\n  margin-right: 0.75rem !important;\n}\n\n.mb-3 {\n  margin-bottom: 0.75rem !important;\n}\n\n.ml-3 {\n  margin-left: 0.75rem !important;\n}\n\n.mx-3 {\n  margin-left: 0.75rem !important;\n  margin-right: 0.75rem !important;\n}\n\n.my-3 {\n  margin-top: 0.75rem !important;\n  margin-bottom: 0.75rem !important;\n}\n\n.m-4 {\n  margin: 1rem !important;\n}\n\n.mt-4 {\n  margin-top: 1rem !important;\n}\n\n.mr-4 {\n  margin-right: 1rem !important;\n}\n\n.mb-4 {\n  margin-bottom: 1rem !important;\n}\n\n.ml-4 {\n  margin-left: 1rem !important;\n}\n\n.mx-4 {\n  margin-left: 1rem !important;\n  margin-right: 1rem !important;\n}\n\n.my-4 {\n  margin-top: 1rem !important;\n  margin-bottom: 1rem !important;\n}\n\n.m-5 {\n  margin: 1.5rem !important;\n}\n\n.mt-5 {\n  margin-top: 1.5rem !important;\n}\n\n.mr-5 {\n  margin-right: 1.5rem !important;\n}\n\n.mb-5 {\n  margin-bottom: 1.5rem !important;\n}\n\n.ml-5 {\n  margin-left: 1.5rem !important;\n}\n\n.mx-5 {\n  margin-left: 1.5rem !important;\n  margin-right: 1.5rem !important;\n}\n\n.my-5 {\n  margin-top: 1.5rem !important;\n  margin-bottom: 1.5rem !important;\n}\n\n.m-6 {\n  margin: 3rem !important;\n}\n\n.mt-6 {\n  margin-top: 3rem !important;\n}\n\n.mr-6 {\n  margin-right: 3rem !important;\n}\n\n.mb-6 {\n  margin-bottom: 3rem !important;\n}\n\n.ml-6 {\n  margin-left: 3rem !important;\n}\n\n.mx-6 {\n  margin-left: 3rem !important;\n  margin-right: 3rem !important;\n}\n\n.my-6 {\n  margin-top: 3rem !important;\n  margin-bottom: 3rem !important;\n}\n\n.m-auto {\n  margin: auto !important;\n}\n\n.mt-auto {\n  margin-top: auto !important;\n}\n\n.mr-auto {\n  margin-right: auto !important;\n}\n\n.mb-auto {\n  margin-bottom: auto !important;\n}\n\n.ml-auto {\n  margin-left: auto !important;\n}\n\n.mx-auto {\n  margin-left: auto !important;\n  margin-right: auto !important;\n}\n\n.my-auto {\n  margin-top: auto !important;\n  margin-bottom: auto !important;\n}\n\n.p-0 {\n  padding: 0 !important;\n}\n\n.pt-0 {\n  padding-top: 0 !important;\n}\n\n.pr-0 {\n  padding-right: 0 !important;\n}\n\n.pb-0 {\n  padding-bottom: 0 !important;\n}\n\n.pl-0 {\n  padding-left: 0 !important;\n}\n\n.px-0 {\n  padding-left: 0 !important;\n  padding-right: 0 !important;\n}\n\n.py-0 {\n  padding-top: 0 !important;\n  padding-bottom: 0 !important;\n}\n\n.p-1 {\n  padding: 0.25rem !important;\n}\n\n.pt-1 {\n  padding-top: 0.25rem !important;\n}\n\n.pr-1 {\n  padding-right: 0.25rem !important;\n}\n\n.pb-1 {\n  padding-bottom: 0.25rem !important;\n}\n\n.pl-1 {\n  padding-left: 0.25rem !important;\n}\n\n.px-1 {\n  padding-left: 0.25rem !important;\n  padding-right: 0.25rem !important;\n}\n\n.py-1 {\n  padding-top: 0.25rem !important;\n  padding-bottom: 0.25rem !important;\n}\n\n.p-2 {\n  padding: 0.5rem !important;\n}\n\n.pt-2 {\n  padding-top: 0.5rem !important;\n}\n\n.pr-2 {\n  padding-right: 0.5rem !important;\n}\n\n.pb-2 {\n  padding-bottom: 0.5rem !important;\n}\n\n.pl-2 {\n  padding-left: 0.5rem !important;\n}\n\n.px-2 {\n  padding-left: 0.5rem !important;\n  padding-right: 0.5rem !important;\n}\n\n.py-2 {\n  padding-top: 0.5rem !important;\n  padding-bottom: 0.5rem !important;\n}\n\n.p-3 {\n  padding: 0.75rem !important;\n}\n\n.pt-3 {\n  padding-top: 0.75rem !important;\n}\n\n.pr-3 {\n  padding-right: 0.75rem !important;\n}\n\n.pb-3 {\n  padding-bottom: 0.75rem !important;\n}\n\n.pl-3 {\n  padding-left: 0.75rem !important;\n}\n\n.px-3 {\n  padding-left: 0.75rem !important;\n  padding-right: 0.75rem !important;\n}\n\n.py-3 {\n  padding-top: 0.75rem !important;\n  padding-bottom: 0.75rem !important;\n}\n\n.p-4 {\n  padding: 1rem !important;\n}\n\n.pt-4 {\n  padding-top: 1rem !important;\n}\n\n.pr-4 {\n  padding-right: 1rem !important;\n}\n\n.pb-4 {\n  padding-bottom: 1rem !important;\n}\n\n.pl-4 {\n  padding-left: 1rem !important;\n}\n\n.px-4 {\n  padding-left: 1rem !important;\n  padding-right: 1rem !important;\n}\n\n.py-4 {\n  padding-top: 1rem !important;\n  padding-bottom: 1rem !important;\n}\n\n.p-5 {\n  padding: 1.5rem !important;\n}\n\n.pt-5 {\n  padding-top: 1.5rem !important;\n}\n\n.pr-5 {\n  padding-right: 1.5rem !important;\n}\n\n.pb-5 {\n  padding-bottom: 1.5rem !important;\n}\n\n.pl-5 {\n  padding-left: 1.5rem !important;\n}\n\n.px-5 {\n  padding-left: 1.5rem !important;\n  padding-right: 1.5rem !important;\n}\n\n.py-5 {\n  padding-top: 1.5rem !important;\n  padding-bottom: 1.5rem !important;\n}\n\n.p-6 {\n  padding: 3rem !important;\n}\n\n.pt-6 {\n  padding-top: 3rem !important;\n}\n\n.pr-6 {\n  padding-right: 3rem !important;\n}\n\n.pb-6 {\n  padding-bottom: 3rem !important;\n}\n\n.pl-6 {\n  padding-left: 3rem !important;\n}\n\n.px-6 {\n  padding-left: 3rem !important;\n  padding-right: 3rem !important;\n}\n\n.py-6 {\n  padding-top: 3rem !important;\n  padding-bottom: 3rem !important;\n}\n\n.p-auto {\n  padding: auto !important;\n}\n\n.pt-auto {\n  padding-top: auto !important;\n}\n\n.pr-auto {\n  padding-right: auto !important;\n}\n\n.pb-auto {\n  padding-bottom: auto !important;\n}\n\n.pl-auto {\n  padding-left: auto !important;\n}\n\n.px-auto {\n  padding-left: auto !important;\n  padding-right: auto !important;\n}\n\n.py-auto {\n  padding-top: auto !important;\n  padding-bottom: auto !important;\n}\n\n.is-size-1 {\n  font-size: 3rem !important;\n}\n\n.is-size-2 {\n  font-size: 2.5rem !important;\n}\n\n.is-size-3 {\n  font-size: 2rem !important;\n}\n\n.is-size-4 {\n  font-size: 1.5rem !important;\n}\n\n.is-size-5 {\n  font-size: 1.25rem !important;\n}\n\n.is-size-6 {\n  font-size: 1rem !important;\n}\n\n.is-size-7 {\n  font-size: 0.75rem !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-size-1-mobile {\n    font-size: 3rem !important;\n  }\n  .is-size-2-mobile {\n    font-size: 2.5rem !important;\n  }\n  .is-size-3-mobile {\n    font-size: 2rem !important;\n  }\n  .is-size-4-mobile {\n    font-size: 1.5rem !important;\n  }\n  .is-size-5-mobile {\n    font-size: 1.25rem !important;\n  }\n  .is-size-6-mobile {\n    font-size: 1rem !important;\n  }\n  .is-size-7-mobile {\n    font-size: 0.75rem !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-size-1-tablet {\n    font-size: 3rem !important;\n  }\n  .is-size-2-tablet {\n    font-size: 2.5rem !important;\n  }\n  .is-size-3-tablet {\n    font-size: 2rem !important;\n  }\n  .is-size-4-tablet {\n    font-size: 1.5rem !important;\n  }\n  .is-size-5-tablet {\n    font-size: 1.25rem !important;\n  }\n  .is-size-6-tablet {\n    font-size: 1rem !important;\n  }\n  .is-size-7-tablet {\n    font-size: 0.75rem !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-size-1-touch {\n    font-size: 3rem !important;\n  }\n  .is-size-2-touch {\n    font-size: 2.5rem !important;\n  }\n  .is-size-3-touch {\n    font-size: 2rem !important;\n  }\n  .is-size-4-touch {\n    font-size: 1.5rem !important;\n  }\n  .is-size-5-touch {\n    font-size: 1.25rem !important;\n  }\n  .is-size-6-touch {\n    font-size: 1rem !important;\n  }\n  .is-size-7-touch {\n    font-size: 0.75rem !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-size-1-desktop {\n    font-size: 3rem !important;\n  }\n  .is-size-2-desktop {\n    font-size: 2.5rem !important;\n  }\n  .is-size-3-desktop {\n    font-size: 2rem !important;\n  }\n  .is-size-4-desktop {\n    font-size: 1.5rem !important;\n  }\n  .is-size-5-desktop {\n    font-size: 1.25rem !important;\n  }\n  .is-size-6-desktop {\n    font-size: 1rem !important;\n  }\n  .is-size-7-desktop {\n    font-size: 0.75rem !important;\n  }\n}\n.has-text-centered {\n  text-align: center !important;\n}\n\n.has-text-justified {\n  text-align: justify !important;\n}\n\n.has-text-left {\n  text-align: left !important;\n}\n\n.has-text-right {\n  text-align: right !important;\n}\n\n@media screen and (max-width: 768px) {\n  .has-text-centered-mobile {\n    text-align: center !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .has-text-centered-tablet {\n    text-align: center !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .has-text-centered-tablet-only {\n    text-align: center !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .has-text-centered-touch {\n    text-align: center !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .has-text-centered-desktop {\n    text-align: center !important;\n  }\n}\n@media screen and (max-width: 768px) {\n  .has-text-justified-mobile {\n    text-align: justify !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .has-text-justified-tablet {\n    text-align: justify !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .has-text-justified-tablet-only {\n    text-align: justify !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .has-text-justified-touch {\n    text-align: justify !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .has-text-justified-desktop {\n    text-align: justify !important;\n  }\n}\n@media screen and (max-width: 768px) {\n  .has-text-left-mobile {\n    text-align: left !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .has-text-left-tablet {\n    text-align: left !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .has-text-left-tablet-only {\n    text-align: left !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .has-text-left-touch {\n    text-align: left !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .has-text-left-desktop {\n    text-align: left !important;\n  }\n}\n@media screen and (max-width: 768px) {\n  .has-text-right-mobile {\n    text-align: right !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .has-text-right-tablet {\n    text-align: right !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .has-text-right-tablet-only {\n    text-align: right !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .has-text-right-touch {\n    text-align: right !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .has-text-right-desktop {\n    text-align: right !important;\n  }\n}\n.is-capitalized {\n  text-transform: capitalize !important;\n}\n\n.is-lowercase {\n  text-transform: lowercase !important;\n}\n\n.is-uppercase {\n  text-transform: uppercase !important;\n}\n\n.is-italic {\n  font-style: italic !important;\n}\n\n.is-underlined {\n  text-decoration: underline !important;\n}\n\n.has-text-weight-light {\n  font-weight: 300 !important;\n}\n\n.has-text-weight-normal {\n  font-weight: 400 !important;\n}\n\n.has-text-weight-medium {\n  font-weight: 500 !important;\n}\n\n.has-text-weight-semibold {\n  font-weight: 600 !important;\n}\n\n.has-text-weight-bold {\n  font-weight: 700 !important;\n}\n\n.is-family-primary {\n  font-family: \"Nunito\", sans-serif !important;\n}\n\n.is-family-secondary {\n  font-family: \"Nunito\", sans-serif !important;\n}\n\n.is-family-sans-serif {\n  font-family: \"Nunito\", sans-serif !important;\n}\n\n.is-family-monospace {\n  font-family: monospace !important;\n}\n\n.is-family-code {\n  font-family: monospace !important;\n}\n\n.is-block {\n  display: block !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-block-mobile {\n    display: block !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-block-tablet {\n    display: block !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-block-tablet-only {\n    display: block !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-block-touch {\n    display: block !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-block-desktop {\n    display: block !important;\n  }\n}\n.is-flex {\n  display: flex !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-flex-mobile {\n    display: flex !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-flex-tablet {\n    display: flex !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-flex-tablet-only {\n    display: flex !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-flex-touch {\n    display: flex !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-flex-desktop {\n    display: flex !important;\n  }\n}\n.is-inline {\n  display: inline !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-inline-mobile {\n    display: inline !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-inline-tablet {\n    display: inline !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-inline-tablet-only {\n    display: inline !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-inline-touch {\n    display: inline !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-inline-desktop {\n    display: inline !important;\n  }\n}\n.is-inline-block {\n  display: inline-block !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-inline-block-mobile {\n    display: inline-block !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-inline-block-tablet {\n    display: inline-block !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-inline-block-tablet-only {\n    display: inline-block !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-inline-block-touch {\n    display: inline-block !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-inline-block-desktop {\n    display: inline-block !important;\n  }\n}\n.is-inline-flex {\n  display: inline-flex !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-inline-flex-mobile {\n    display: inline-flex !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-inline-flex-tablet {\n    display: inline-flex !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-inline-flex-tablet-only {\n    display: inline-flex !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-inline-flex-touch {\n    display: inline-flex !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-inline-flex-desktop {\n    display: inline-flex !important;\n  }\n}\n.is-hidden {\n  display: none !important;\n}\n\n.is-sr-only {\n  border: none !important;\n  clip: rect(0, 0, 0, 0) !important;\n  height: 0.01em !important;\n  overflow: hidden !important;\n  padding: 0 !important;\n  position: absolute !important;\n  white-space: nowrap !important;\n  width: 0.01em !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-hidden-mobile {\n    display: none !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-hidden-tablet {\n    display: none !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-hidden-tablet-only {\n    display: none !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-hidden-touch {\n    display: none !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-hidden-desktop {\n    display: none !important;\n  }\n}\n.is-invisible {\n  visibility: hidden !important;\n}\n\n@media screen and (max-width: 768px) {\n  .is-invisible-mobile {\n    visibility: hidden !important;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .is-invisible-tablet {\n    visibility: hidden !important;\n  }\n}\n@media screen and (min-width: 769px) and (max-width: 1023px) {\n  .is-invisible-tablet-only {\n    visibility: hidden !important;\n  }\n}\n@media screen and (max-width: 1023px) {\n  .is-invisible-touch {\n    visibility: hidden !important;\n  }\n}\n@media screen and (min-width: 1024px) {\n  .is-invisible-desktop {\n    visibility: hidden !important;\n  }\n}\n/* Bulma Layout */\n.hero {\n  align-items: stretch;\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n}\n.hero .navbar {\n  background: none;\n}\n.hero .tabs ul {\n  border-bottom: none;\n}\n.hero.is-white {\n  background-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.hero.is-white a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-white strong {\n  color: inherit;\n}\n.hero.is-white .title {\n  color: hsl(0, 0%, 4%);\n}\n.hero.is-white .subtitle {\n  color: rgba(10, 10, 10, 0.9);\n}\n.hero.is-white .subtitle a:not(.button),\n.hero.is-white .subtitle strong {\n  color: hsl(0, 0%, 4%);\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-white .navbar-menu {\n    background-color: hsl(0, 0%, 100%);\n  }\n}\n.hero.is-white .navbar-item,\n.hero.is-white .navbar-link {\n  color: rgba(10, 10, 10, 0.7);\n}\n.hero.is-white a.navbar-item:hover, .hero.is-white a.navbar-item.is-active,\n.hero.is-white .navbar-link:hover,\n.hero.is-white .navbar-link.is-active {\n  background-color: #f2f2f2;\n  color: hsl(0, 0%, 4%);\n}\n.hero.is-white .tabs a {\n  color: hsl(0, 0%, 4%);\n  opacity: 0.9;\n}\n.hero.is-white .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-white .tabs li.is-active a {\n  color: hsl(0, 0%, 100%) !important;\n  opacity: 1;\n}\n.hero.is-white .tabs.is-boxed a, .hero.is-white .tabs.is-toggle a {\n  color: hsl(0, 0%, 4%);\n}\n.hero.is-white .tabs.is-boxed a:hover, .hero.is-white .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-white .tabs.is-boxed li.is-active a, .hero.is-white .tabs.is-boxed li.is-active a:hover, .hero.is-white .tabs.is-toggle li.is-active a, .hero.is-white .tabs.is-toggle li.is-active a:hover {\n  background-color: hsl(0, 0%, 4%);\n  border-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.hero.is-white.is-bold {\n  background-image: linear-gradient(141deg, #e8e3e4 0%, hsl(0, 0%, 100%) 71%, white 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-white.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #e8e3e4 0%, hsl(0, 0%, 100%) 71%, white 100%);\n  }\n}\n.hero.is-black {\n  background-color: hsl(0, 0%, 4%);\n  color: hsl(0, 0%, 100%);\n}\n.hero.is-black a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-black strong {\n  color: inherit;\n}\n.hero.is-black .title {\n  color: hsl(0, 0%, 100%);\n}\n.hero.is-black .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-black .subtitle a:not(.button),\n.hero.is-black .subtitle strong {\n  color: hsl(0, 0%, 100%);\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-black .navbar-menu {\n    background-color: hsl(0, 0%, 4%);\n  }\n}\n.hero.is-black .navbar-item,\n.hero.is-black .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-black a.navbar-item:hover, .hero.is-black a.navbar-item.is-active,\n.hero.is-black .navbar-link:hover,\n.hero.is-black .navbar-link.is-active {\n  background-color: black;\n  color: hsl(0, 0%, 100%);\n}\n.hero.is-black .tabs a {\n  color: hsl(0, 0%, 100%);\n  opacity: 0.9;\n}\n.hero.is-black .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-black .tabs li.is-active a {\n  color: hsl(0, 0%, 4%) !important;\n  opacity: 1;\n}\n.hero.is-black .tabs.is-boxed a, .hero.is-black .tabs.is-toggle a {\n  color: hsl(0, 0%, 100%);\n}\n.hero.is-black .tabs.is-boxed a:hover, .hero.is-black .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-black .tabs.is-boxed li.is-active a, .hero.is-black .tabs.is-boxed li.is-active a:hover, .hero.is-black .tabs.is-toggle li.is-active a, .hero.is-black .tabs.is-toggle li.is-active a:hover {\n  background-color: hsl(0, 0%, 100%);\n  border-color: hsl(0, 0%, 100%);\n  color: hsl(0, 0%, 4%);\n}\n.hero.is-black.is-bold {\n  background-image: linear-gradient(141deg, black 0%, hsl(0, 0%, 4%) 71%, #181616 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-black.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, black 0%, hsl(0, 0%, 4%) 71%, #181616 100%);\n  }\n}\n.hero.is-light {\n  background-color: hsl(0, 0%, 96%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-light a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-light strong {\n  color: inherit;\n}\n.hero.is-light .title {\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-light .subtitle {\n  color: rgba(0, 0, 0, 0.9);\n}\n.hero.is-light .subtitle a:not(.button),\n.hero.is-light .subtitle strong {\n  color: rgba(0, 0, 0, 0.7);\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-light .navbar-menu {\n    background-color: hsl(0, 0%, 96%);\n  }\n}\n.hero.is-light .navbar-item,\n.hero.is-light .navbar-link {\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-light a.navbar-item:hover, .hero.is-light a.navbar-item.is-active,\n.hero.is-light .navbar-link:hover,\n.hero.is-light .navbar-link.is-active {\n  background-color: #e8e8e8;\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-light .tabs a {\n  color: rgba(0, 0, 0, 0.7);\n  opacity: 0.9;\n}\n.hero.is-light .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-light .tabs li.is-active a {\n  color: hsl(0, 0%, 96%) !important;\n  opacity: 1;\n}\n.hero.is-light .tabs.is-boxed a, .hero.is-light .tabs.is-toggle a {\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-light .tabs.is-boxed a:hover, .hero.is-light .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-light .tabs.is-boxed li.is-active a, .hero.is-light .tabs.is-boxed li.is-active a:hover, .hero.is-light .tabs.is-toggle li.is-active a, .hero.is-light .tabs.is-toggle li.is-active a:hover {\n  background-color: rgba(0, 0, 0, 0.7);\n  border-color: rgba(0, 0, 0, 0.7);\n  color: hsl(0, 0%, 96%);\n}\n.hero.is-light.is-bold {\n  background-image: linear-gradient(141deg, #dfd8d9 0%, hsl(0, 0%, 96%) 71%, white 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-light.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #dfd8d9 0%, hsl(0, 0%, 96%) 71%, white 100%);\n  }\n}\n.hero.is-dark {\n  background-color: #242424;\n  color: #fff;\n}\n.hero.is-dark a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-dark strong {\n  color: inherit;\n}\n.hero.is-dark .title {\n  color: #fff;\n}\n.hero.is-dark .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-dark .subtitle a:not(.button),\n.hero.is-dark .subtitle strong {\n  color: #fff;\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-dark .navbar-menu {\n    background-color: #242424;\n  }\n}\n.hero.is-dark .navbar-item,\n.hero.is-dark .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-dark a.navbar-item:hover, .hero.is-dark a.navbar-item.is-active,\n.hero.is-dark .navbar-link:hover,\n.hero.is-dark .navbar-link.is-active {\n  background-color: #171717;\n  color: #fff;\n}\n.hero.is-dark .tabs a {\n  color: #fff;\n  opacity: 0.9;\n}\n.hero.is-dark .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-dark .tabs li.is-active a {\n  color: #242424 !important;\n  opacity: 1;\n}\n.hero.is-dark .tabs.is-boxed a, .hero.is-dark .tabs.is-toggle a {\n  color: #fff;\n}\n.hero.is-dark .tabs.is-boxed a:hover, .hero.is-dark .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-dark .tabs.is-boxed li.is-active a, .hero.is-dark .tabs.is-boxed li.is-active a:hover, .hero.is-dark .tabs.is-toggle li.is-active a, .hero.is-dark .tabs.is-toggle li.is-active a:hover {\n  background-color: #fff;\n  border-color: #fff;\n  color: #242424;\n}\n.hero.is-dark.is-bold {\n  background-image: linear-gradient(141deg, #0c090a 0%, #242424 71%, #332f2e 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-dark.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #0c090a 0%, #242424 71%, #332f2e 100%);\n  }\n}\n.hero.is-primary {\n  background-color: #00d1b2;\n  color: #fff;\n}\n.hero.is-primary a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-primary strong {\n  color: inherit;\n}\n.hero.is-primary .title {\n  color: #fff;\n}\n.hero.is-primary .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-primary .subtitle a:not(.button),\n.hero.is-primary .subtitle strong {\n  color: #fff;\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-primary .navbar-menu {\n    background-color: #00d1b2;\n  }\n}\n.hero.is-primary .navbar-item,\n.hero.is-primary .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-primary a.navbar-item:hover, .hero.is-primary a.navbar-item.is-active,\n.hero.is-primary .navbar-link:hover,\n.hero.is-primary .navbar-link.is-active {\n  background-color: #00b89c;\n  color: #fff;\n}\n.hero.is-primary .tabs a {\n  color: #fff;\n  opacity: 0.9;\n}\n.hero.is-primary .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-primary .tabs li.is-active a {\n  color: #00d1b2 !important;\n  opacity: 1;\n}\n.hero.is-primary .tabs.is-boxed a, .hero.is-primary .tabs.is-toggle a {\n  color: #fff;\n}\n.hero.is-primary .tabs.is-boxed a:hover, .hero.is-primary .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-primary .tabs.is-boxed li.is-active a, .hero.is-primary .tabs.is-boxed li.is-active a:hover, .hero.is-primary .tabs.is-toggle li.is-active a, .hero.is-primary .tabs.is-toggle li.is-active a:hover {\n  background-color: #fff;\n  border-color: #fff;\n  color: #00d1b2;\n}\n.hero.is-primary.is-bold {\n  background-image: linear-gradient(141deg, #009e6c 0%, #00d1b2 71%, #00e6eb 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-primary.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #009e6c 0%, #00d1b2 71%, #00e6eb 100%);\n  }\n}\n.hero.is-link {\n  background-color: #3273dc;\n  color: #fff;\n}\n.hero.is-link a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-link strong {\n  color: inherit;\n}\n.hero.is-link .title {\n  color: #fff;\n}\n.hero.is-link .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-link .subtitle a:not(.button),\n.hero.is-link .subtitle strong {\n  color: #fff;\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-link .navbar-menu {\n    background-color: #3273dc;\n  }\n}\n.hero.is-link .navbar-item,\n.hero.is-link .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-link a.navbar-item:hover, .hero.is-link a.navbar-item.is-active,\n.hero.is-link .navbar-link:hover,\n.hero.is-link .navbar-link.is-active {\n  background-color: #2466d1;\n  color: #fff;\n}\n.hero.is-link .tabs a {\n  color: #fff;\n  opacity: 0.9;\n}\n.hero.is-link .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-link .tabs li.is-active a {\n  color: #3273dc !important;\n  opacity: 1;\n}\n.hero.is-link .tabs.is-boxed a, .hero.is-link .tabs.is-toggle a {\n  color: #fff;\n}\n.hero.is-link .tabs.is-boxed a:hover, .hero.is-link .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-link .tabs.is-boxed li.is-active a, .hero.is-link .tabs.is-boxed li.is-active a:hover, .hero.is-link .tabs.is-toggle li.is-active a, .hero.is-link .tabs.is-toggle li.is-active a:hover {\n  background-color: #fff;\n  border-color: #fff;\n  color: #3273dc;\n}\n.hero.is-link.is-bold {\n  background-image: linear-gradient(141deg, #1576c6 0%, #3273dc 71%, #4266e5 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-link.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #1576c6 0%, #3273dc 71%, #4266e5 100%);\n  }\n}\n.hero.is-info {\n  background-color: hsl(207, 61%, 53%);\n  color: #fff;\n}\n.hero.is-info a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-info strong {\n  color: inherit;\n}\n.hero.is-info .title {\n  color: #fff;\n}\n.hero.is-info .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-info .subtitle a:not(.button),\n.hero.is-info .subtitle strong {\n  color: #fff;\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-info .navbar-menu {\n    background-color: hsl(207, 61%, 53%);\n  }\n}\n.hero.is-info .navbar-item,\n.hero.is-info .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-info a.navbar-item:hover, .hero.is-info a.navbar-item.is-active,\n.hero.is-info .navbar-link:hover,\n.hero.is-info .navbar-link.is-active {\n  background-color: #3082c5;\n  color: #fff;\n}\n.hero.is-info .tabs a {\n  color: #fff;\n  opacity: 0.9;\n}\n.hero.is-info .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-info .tabs li.is-active a {\n  color: hsl(207, 61%, 53%) !important;\n  opacity: 1;\n}\n.hero.is-info .tabs.is-boxed a, .hero.is-info .tabs.is-toggle a {\n  color: #fff;\n}\n.hero.is-info .tabs.is-boxed a:hover, .hero.is-info .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-info .tabs.is-boxed li.is-active a, .hero.is-info .tabs.is-boxed li.is-active a:hover, .hero.is-info .tabs.is-toggle li.is-active a, .hero.is-info .tabs.is-toggle li.is-active a:hover {\n  background-color: #fff;\n  border-color: #fff;\n  color: hsl(207, 61%, 53%);\n}\n.hero.is-info.is-bold {\n  background-image: linear-gradient(141deg, #208fbc 0%, hsl(207, 61%, 53%) 71%, #4d83db 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-info.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #208fbc 0%, hsl(207, 61%, 53%) 71%, #4d83db 100%);\n  }\n}\n.hero.is-success {\n  background-color: hsl(153, 53%, 53%);\n  color: #fff;\n}\n.hero.is-success a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-success strong {\n  color: inherit;\n}\n.hero.is-success .title {\n  color: #fff;\n}\n.hero.is-success .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-success .subtitle a:not(.button),\n.hero.is-success .subtitle strong {\n  color: #fff;\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-success .navbar-menu {\n    background-color: hsl(153, 53%, 53%);\n  }\n}\n.hero.is-success .navbar-item,\n.hero.is-success .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-success a.navbar-item:hover, .hero.is-success a.navbar-item.is-active,\n.hero.is-success .navbar-link:hover,\n.hero.is-success .navbar-link.is-active {\n  background-color: #3abb81;\n  color: #fff;\n}\n.hero.is-success .tabs a {\n  color: #fff;\n  opacity: 0.9;\n}\n.hero.is-success .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-success .tabs li.is-active a {\n  color: hsl(153, 53%, 53%) !important;\n  opacity: 1;\n}\n.hero.is-success .tabs.is-boxed a, .hero.is-success .tabs.is-toggle a {\n  color: #fff;\n}\n.hero.is-success .tabs.is-boxed a:hover, .hero.is-success .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-success .tabs.is-boxed li.is-active a, .hero.is-success .tabs.is-boxed li.is-active a:hover, .hero.is-success .tabs.is-toggle li.is-active a, .hero.is-success .tabs.is-toggle li.is-active a:hover {\n  background-color: #fff;\n  border-color: #fff;\n  color: hsl(153, 53%, 53%);\n}\n.hero.is-success.is-bold {\n  background-image: linear-gradient(141deg, #29b35e 0%, hsl(153, 53%, 53%) 71%, #56d2af 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-success.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #29b35e 0%, hsl(153, 53%, 53%) 71%, #56d2af 100%);\n  }\n}\n.hero.is-warning {\n  background-color: hsl(44, 100%, 77%);\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-warning a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-warning strong {\n  color: inherit;\n}\n.hero.is-warning .title {\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-warning .subtitle {\n  color: rgba(0, 0, 0, 0.9);\n}\n.hero.is-warning .subtitle a:not(.button),\n.hero.is-warning .subtitle strong {\n  color: rgba(0, 0, 0, 0.7);\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-warning .navbar-menu {\n    background-color: hsl(44, 100%, 77%);\n  }\n}\n.hero.is-warning .navbar-item,\n.hero.is-warning .navbar-link {\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-warning a.navbar-item:hover, .hero.is-warning a.navbar-item.is-active,\n.hero.is-warning .navbar-link:hover,\n.hero.is-warning .navbar-link.is-active {\n  background-color: #ffd970;\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-warning .tabs a {\n  color: rgba(0, 0, 0, 0.7);\n  opacity: 0.9;\n}\n.hero.is-warning .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-warning .tabs li.is-active a {\n  color: hsl(44, 100%, 77%) !important;\n  opacity: 1;\n}\n.hero.is-warning .tabs.is-boxed a, .hero.is-warning .tabs.is-toggle a {\n  color: rgba(0, 0, 0, 0.7);\n}\n.hero.is-warning .tabs.is-boxed a:hover, .hero.is-warning .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-warning .tabs.is-boxed li.is-active a, .hero.is-warning .tabs.is-boxed li.is-active a:hover, .hero.is-warning .tabs.is-toggle li.is-active a, .hero.is-warning .tabs.is-toggle li.is-active a:hover {\n  background-color: rgba(0, 0, 0, 0.7);\n  border-color: rgba(0, 0, 0, 0.7);\n  color: hsl(44, 100%, 77%);\n}\n.hero.is-warning.is-bold {\n  background-image: linear-gradient(141deg, #ffb657 0%, hsl(44, 100%, 77%) 71%, #fff6a3 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-warning.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #ffb657 0%, hsl(44, 100%, 77%) 71%, #fff6a3 100%);\n  }\n}\n.hero.is-danger {\n  background-color: hsl(348, 86%, 61%);\n  color: #fff;\n}\n.hero.is-danger a:not(.button):not(.dropdown-item):not(.tag):not(.pagination-link.is-current),\n.hero.is-danger strong {\n  color: inherit;\n}\n.hero.is-danger .title {\n  color: #fff;\n}\n.hero.is-danger .subtitle {\n  color: rgba(255, 255, 255, 0.9);\n}\n.hero.is-danger .subtitle a:not(.button),\n.hero.is-danger .subtitle strong {\n  color: #fff;\n}\n@media screen and (max-width: 1023px) {\n  .hero.is-danger .navbar-menu {\n    background-color: hsl(348, 86%, 61%);\n  }\n}\n.hero.is-danger .navbar-item,\n.hero.is-danger .navbar-link {\n  color: rgba(255, 255, 255, 0.7);\n}\n.hero.is-danger a.navbar-item:hover, .hero.is-danger a.navbar-item.is-active,\n.hero.is-danger .navbar-link:hover,\n.hero.is-danger .navbar-link.is-active {\n  background-color: #ef2e55;\n  color: #fff;\n}\n.hero.is-danger .tabs a {\n  color: #fff;\n  opacity: 0.9;\n}\n.hero.is-danger .tabs a:hover {\n  opacity: 1;\n}\n.hero.is-danger .tabs li.is-active a {\n  color: hsl(348, 86%, 61%) !important;\n  opacity: 1;\n}\n.hero.is-danger .tabs.is-boxed a, .hero.is-danger .tabs.is-toggle a {\n  color: #fff;\n}\n.hero.is-danger .tabs.is-boxed a:hover, .hero.is-danger .tabs.is-toggle a:hover {\n  background-color: rgba(10, 10, 10, 0.1);\n}\n.hero.is-danger .tabs.is-boxed li.is-active a, .hero.is-danger .tabs.is-boxed li.is-active a:hover, .hero.is-danger .tabs.is-toggle li.is-active a, .hero.is-danger .tabs.is-toggle li.is-active a:hover {\n  background-color: #fff;\n  border-color: #fff;\n  color: hsl(348, 86%, 61%);\n}\n.hero.is-danger.is-bold {\n  background-image: linear-gradient(141deg, #fa0a62 0%, hsl(348, 86%, 61%) 71%, #f7595f 100%);\n}\n@media screen and (max-width: 768px) {\n  .hero.is-danger.is-bold .navbar-menu {\n    background-image: linear-gradient(141deg, #fa0a62 0%, hsl(348, 86%, 61%) 71%, #f7595f 100%);\n  }\n}\n.hero.is-small .hero-body {\n  padding: 1.5rem;\n}\n@media screen and (min-width: 769px), print {\n  .hero.is-medium .hero-body {\n    padding: 9rem 4.5rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .hero.is-large .hero-body {\n    padding: 18rem 6rem;\n  }\n}\n.hero.is-halfheight .hero-body, .hero.is-fullheight .hero-body, .hero.is-fullheight-with-navbar .hero-body {\n  align-items: center;\n  display: flex;\n}\n.hero.is-halfheight .hero-body > .container, .hero.is-fullheight .hero-body > .container, .hero.is-fullheight-with-navbar .hero-body > .container {\n  flex-grow: 1;\n  flex-shrink: 1;\n}\n.hero.is-halfheight {\n  min-height: 50vh;\n}\n.hero.is-fullheight {\n  min-height: 100vh;\n}\n\n.hero-video {\n  overflow: hidden;\n}\n.hero-video video {\n  left: 50%;\n  min-height: 100%;\n  min-width: 100%;\n  position: absolute;\n  top: 50%;\n  transform: translate3d(-50%, -50%, 0);\n}\n.hero-video.is-transparent {\n  opacity: 0.3;\n}\n@media screen and (max-width: 768px) {\n  .hero-video {\n    display: none;\n  }\n}\n\n.hero-buttons {\n  margin-top: 1.5rem;\n}\n@media screen and (max-width: 768px) {\n  .hero-buttons .button {\n    display: flex;\n  }\n  .hero-buttons .button:not(:last-child) {\n    margin-bottom: 0.75rem;\n  }\n}\n@media screen and (min-width: 769px), print {\n  .hero-buttons {\n    display: flex;\n    justify-content: center;\n  }\n  .hero-buttons .button:not(:last-child) {\n    margin-right: 1.5rem;\n  }\n}\n\n.hero-head,\n.hero-foot {\n  flex-grow: 0;\n  flex-shrink: 0;\n}\n\n.hero-body {\n  flex-grow: 1;\n  flex-shrink: 0;\n  padding: 3rem 1.5rem;\n}\n@media screen and (min-width: 769px), print {\n  .hero-body {\n    padding: 3rem 3rem;\n  }\n}\n\n.section {\n  padding: 3rem 1.5rem;\n}\n@media screen and (min-width: 1024px) {\n  .section {\n    padding: 3rem 3rem;\n  }\n  .section.is-medium {\n    padding: 9rem 4.5rem;\n  }\n  .section.is-large {\n    padding: 18rem 6rem;\n  }\n}\n\n.footer {\n  background-color: hsl(0, 0%, 98%);\n  padding: 3rem 1.5rem 6rem;\n}\n\n.same-width-button {\n  width: 170px; /* Adjust this value as needed */\n  text-align: center;\n  border: 2px solid #363636;\n  color: #363636;\n  background-color: #dbdbdb;\n  transition: all 0.3s ease;\n}\n.same-width-button:hover {\n  background-color: whitesmoke;\n  border-color: #505050;\n}\n.same-width-button.is-active {\n  background-color: #00d1b2;\n  color: #fff;\n  border-color: #00d1b2;\n}\n\n.button {\n  font-family: \"Nunito\", sans-serif;\n  font-weight: 700;\n  border-radius: 4px;\n  padding: 10px 15px;\n}\n\n.box {\n  background-color: #434343;\n  color: #dbdbdb;\n  border-radius: 10px;\n  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);\n}\n\n.container {\n  background-color: #242424;\n  padding: 20px;\n  border-radius: 10px;\n}\n\na {\n  color: #3273dc;\n  text-decoration: underline;\n}\na:hover {\n  color: #5e91e3;\n}\n\np {\n  color: #dbdbdb;\n  font-size: 1.1em;\n}";
	styleInject(css_248z$7);

	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	/**
	 * https://svelte.dev/docs/svelte-easing
	 * @param {number} t
	 * @returns {number}
	 */
	function cubicOut(t) {
		const f = t - 1.0;
		return f * f * f + 1.0;
	}

	/**
	 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
	 *
	 * https://svelte.dev/docs/svelte-transition#fly
	 * @param {Element} node
	 * @param {import('./public').FlyParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fly(
		node,
		{ delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}
	) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const transform = style.transform === 'none' ? '' : style.transform;
		const od = target_opacity * (1 - opacity);
		const [xValue, xUnit] = split_css_unit(x);
		const [yValue, yUnit] = split_css_unit(y);
		return {
			delay,
			duration,
			easing,
			css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
		};
	}

	/**
	 * @param {any} obj
	 * @returns {boolean}
	 */
	function is_date(obj) {
		return Object.prototype.toString.call(obj) === '[object Date]';
	}

	/** @returns {(t: any) => any} */
	function get_interpolator(a, b) {
		if (a === b || a !== a) return () => a;
		const type = typeof a;
		if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
			throw new Error('Cannot interpolate values of different type');
		}
		if (Array.isArray(a)) {
			const arr = b.map((bi, i) => {
				return get_interpolator(a[i], bi);
			});
			return (t) => arr.map((fn) => fn(t));
		}
		if (type === 'object') {
			if (!a || !b) throw new Error('Object cannot be null');
			if (is_date(a) && is_date(b)) {
				a = a.getTime();
				b = b.getTime();
				const delta = b - a;
				return (t) => new Date(a + t * delta);
			}
			const keys = Object.keys(b);
			const interpolators = {};
			keys.forEach((key) => {
				interpolators[key] = get_interpolator(a[key], b[key]);
			});
			return (t) => {
				const result = {};
				keys.forEach((key) => {
					result[key] = interpolators[key](t);
				});
				return result;
			};
		}
		if (type === 'number') {
			const delta = b - a;
			return (t) => a + t * delta;
		}
		throw new Error(`Cannot interpolate ${type} values`);
	}

	/**
	 * A tweened store in Svelte is a special type of store that provides smooth transitions between state values over time.
	 *
	 * https://svelte.dev/docs/svelte-motion#tweened
	 * @template T
	 * @param {T} [value]
	 * @param {import('./private.js').TweenedOptions<T>} [defaults]
	 * @returns {import('./public.js').Tweened<T>}
	 */
	function tweened(value, defaults = {}) {
		const store = writable(value);
		/** @type {import('../internal/private.js').Task} */
		let task;
		let target_value = value;
		/**
		 * @param {T} new_value
		 * @param {import('./private.js').TweenedOptions<T>} [opts]
		 */
		function set(new_value, opts) {
			if (value == null) {
				store.set((value = new_value));
				return Promise.resolve();
			}
			target_value = new_value;
			let previous_task = task;
			let started = false;
			let {
				delay = 0,
				duration = 400,
				easing = identity,
				interpolate = get_interpolator
			} = assign(assign({}, defaults), opts);
			if (duration === 0) {
				if (previous_task) {
					previous_task.abort();
					previous_task = null;
				}
				store.set((value = target_value));
				return Promise.resolve();
			}
			const start = now() + delay;
			let fn;
			task = loop((now) => {
				if (now < start) return true;
				if (!started) {
					fn = interpolate(value, new_value);
					if (typeof duration === 'function') duration = duration(value, new_value);
					started = true;
				}
				if (previous_task) {
					previous_task.abort();
					previous_task = null;
				}
				const elapsed = now - start;
				if (elapsed > /** @type {number} */ (duration)) {
					store.set((value = new_value));
					return false;
				}
				// @ts-ignore
				store.set((value = fn(easing(elapsed / duration))));
				return true;
			});
			return task.promise;
		}
		return {
			set,
			update: (fn, opts) => set(fn(target_value, value), opts),
			subscribe: store.subscribe
		};
	}

	/** true if gallery is in the process of closing */
	const closing = writable(0);

	/** store if user prefers reduced motion  */
	const prefersReducedMotion = globalThis.matchMedia?.(
		'(prefers-reduced-motion: reduce)'
	).matches;

	/** default options for tweens / transitions */
	const defaultTweenOptions = (duration) => ({
		easing: cubicOut,
		duration: prefersReducedMotion ? 0 : duration,
	});

	const getThumbBackground = (activeItem) =>
		!activeItem.thumb || `url(${activeItem.thumb})`;

	/**
	 * Adds attributes to the given node based on the provided object.
	 *
	 * @param {HTMLElement} node - The node to which attributes will be added
	 * @param {Record<string, string | boolean> | string} obj - The object containing key-value pairs of attributes to be added
	 */
	const addAttributes = (node, obj) => {
		if (!obj) {
			return
		}
		if (typeof obj === 'string') {
			obj = JSON.parse(obj);
		}
		for (const key in obj) {
			node.setAttribute(key, obj[key]);
		}
	};

	/* node_modules/bigger-picture/src/components/loading.svelte generated by Svelte v4.2.8 */
	const file$a = "node_modules/bigger-picture/src/components/loading.svelte";

	// (9:0) {#if !loaded}
	function create_if_block_1$3(ctx) {
		let div;
		let span0;
		let t;
		let span1;
		let div_outro;
		let current;

		const block = {
			c: function create() {
				div = element("div");
				span0 = element("span");
				t = space();
				span1 = element("span");
				attr_dev(span0, "class", "bp-bar");
				add_location(span0, file$a, 14, 2, 298);
				attr_dev(span1, "class", "bp-o");
				add_location(span1, file$a, 15, 2, 324);
				attr_dev(div, "class", "bp-load");
				set_style(div, "background-image", getThumbBackground(/*activeItem*/ ctx[0]));
				add_location(div, file$a, 9, 1, 176);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, span0);
				append_dev(div, t);
				append_dev(div, span1);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*activeItem*/ 1) {
					set_style(div, "background-image", getThumbBackground(/*activeItem*/ ctx[0]));
				}
			},
			i: function intro(local) {
				if (current) return;
				if (div_outro) div_outro.end(1);
				current = true;
			},
			o: function outro(local) {
				if (local) {
					div_outro = create_out_transition(div, fly, { duration: 480 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (detaching && div_outro) div_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$3.name,
			type: "if",
			source: "(9:0) {#if !loaded}",
			ctx
		});

		return block;
	}

	// (20:0) {#if $closing}
	function create_if_block$3(ctx) {
		let div;
		let div_intro;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "bp-load");
				set_style(div, "background-image", getThumbBackground(/*activeItem*/ ctx[0]));
				add_location(div, file$a, 20, 1, 377);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*activeItem*/ 1) {
					set_style(div, "background-image", getThumbBackground(/*activeItem*/ ctx[0]));
				}
			},
			i: function intro(local) {
				if (!div_intro) {
					add_render_callback(() => {
						div_intro = create_in_transition(div, fly, { duration: 480 });
						div_intro.start();
					});
				}
			},
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$3.name,
			type: "if",
			source: "(20:0) {#if $closing}",
			ctx
		});

		return block;
	}

	function create_fragment$a(ctx) {
		let t;
		let if_block1_anchor;
		let if_block0 = !/*loaded*/ ctx[1] && create_if_block_1$3(ctx);
		let if_block1 = /*$closing*/ ctx[2] && create_if_block$3(ctx);

		const block = {
			c: function create() {
				if (if_block0) if_block0.c();
				t = space();
				if (if_block1) if_block1.c();
				if_block1_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (if_block0) if_block0.m(target, anchor);
				insert_dev(target, t, anchor);
				if (if_block1) if_block1.m(target, anchor);
				insert_dev(target, if_block1_anchor, anchor);
			},
			p: function update(ctx, [dirty]) {
				if (!/*loaded*/ ctx[1]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);

						if (dirty & /*loaded*/ 2) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_1$3(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(t.parentNode, t);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (/*$closing*/ ctx[2]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty & /*$closing*/ 4) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$3(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			i: function intro(local) {
				transition_in(if_block0);
				transition_in(if_block1);
			},
			o: function outro(local) {
				transition_out(if_block0);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
					detach_dev(if_block1_anchor);
				}

				if (if_block0) if_block0.d(detaching);
				if (if_block1) if_block1.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$a.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$a($$self, $$props, $$invalidate) {
		let $closing;
		validate_store(closing, 'closing');
		component_subscribe($$self, closing, $$value => $$invalidate(2, $closing = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Loading', slots, []);
		let { activeItem } = $$props;
		let { loaded } = $$props;

		$$self.$$.on_mount.push(function () {
			if (activeItem === undefined && !('activeItem' in $$props || $$self.$$.bound[$$self.$$.props['activeItem']])) {
				console.warn("<Loading> was created without expected prop 'activeItem'");
			}

			if (loaded === undefined && !('loaded' in $$props || $$self.$$.bound[$$self.$$.props['loaded']])) {
				console.warn("<Loading> was created without expected prop 'loaded'");
			}
		});

		const writable_props = ['activeItem', 'loaded'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Loading> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('activeItem' in $$props) $$invalidate(0, activeItem = $$props.activeItem);
			if ('loaded' in $$props) $$invalidate(1, loaded = $$props.loaded);
		};

		$$self.$capture_state = () => ({
			fly,
			closing,
			getThumbBackground,
			activeItem,
			loaded,
			$closing
		});

		$$self.$inject_state = $$props => {
			if ('activeItem' in $$props) $$invalidate(0, activeItem = $$props.activeItem);
			if ('loaded' in $$props) $$invalidate(1, loaded = $$props.loaded);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [activeItem, loaded, $closing];
	}

	class Loading extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$a, create_fragment$a, safe_not_equal, { activeItem: 0, loaded: 1 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Loading",
				options,
				id: create_fragment$a.name
			});
		}

		get activeItem() {
			throw new Error("<Loading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set activeItem(value) {
			throw new Error("<Loading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get loaded() {
			throw new Error("<Loading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set loaded(value) {
			throw new Error("<Loading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/bigger-picture/src/components/image.svelte generated by Svelte v4.2.8 */

	const { Object: Object_1 } = globals;
	const file$9 = "node_modules/bigger-picture/src/components/image.svelte";

	// (383:2) {#if loaded}
	function create_if_block_1$2(ctx) {
		let img;
		let img_sizes_value;
		let img_outro;
		let current;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				img = element("img");
				attr_dev(img, "sizes", img_sizes_value = /*opts*/ ctx[8].sizes || `${/*sizes*/ ctx[1]}px`);
				attr_dev(img, "alt", /*activeItem*/ ctx[7].alt);
				add_location(img, file$9, 383, 3, 10297);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						action_destroyer(/*addSrc*/ ctx[21].call(null, img)),
						listen_dev(img, "error", /*error_handler*/ ctx[27], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (!current || dirty[0] & /*sizes*/ 2 && img_sizes_value !== (img_sizes_value = /*opts*/ ctx[8].sizes || `${/*sizes*/ ctx[1]}px`)) {
					attr_dev(img, "sizes", img_sizes_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				if (img_outro) img_outro.end(1);
				current = true;
			},
			o: function outro(local) {
				img_outro = create_out_transition(img, fly, {});
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}

				if (detaching && img_outro) img_outro.end();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$2.name,
			type: "if",
			source: "(383:2) {#if loaded}",
			ctx
		});

		return block;
	}

	// (392:2) {#if showLoader}
	function create_if_block$2(ctx) {
		let loading;
		let current;

		loading = new Loading({
				props: {
					activeItem: /*activeItem*/ ctx[7],
					loaded: /*loaded*/ ctx[2]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(loading.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(loading, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const loading_changes = {};
				if (dirty[0] & /*loaded*/ 4) loading_changes.loaded = /*loaded*/ ctx[2];
				loading.$set(loading_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(loading.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(loading.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(loading, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(392:2) {#if showLoader}",
			ctx
		});

		return block;
	}

	function create_fragment$9(ctx) {
		let div1;
		let div0;
		let t;
		let style_transform = `translate3d(${/*$imageDimensions*/ ctx[0][0] / -2 + /*$zoomDragTranslate*/ ctx[6][0]}px, ${/*$imageDimensions*/ ctx[0][1] / -2 + /*$zoomDragTranslate*/ ctx[6][1]}px, 0)`;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*loaded*/ ctx[2] && create_if_block_1$2(ctx);
		let if_block1 = /*showLoader*/ ctx[3] && create_if_block$2(ctx);

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				if (if_block0) if_block0.c();
				t = space();
				if (if_block1) if_block1.c();
				attr_dev(div0, "class", "bp-img");
				set_style(div0, "width", /*$imageDimensions*/ ctx[0][0] + "px");
				set_style(div0, "height", /*$imageDimensions*/ ctx[0][1] + "px");
				toggle_class(div0, "bp-drag", /*pointerDown*/ ctx[4]);
				toggle_class(div0, "bp-canzoom", /*maxZoom*/ ctx[11] > 1 && /*$imageDimensions*/ ctx[0][0] < /*naturalWidth*/ ctx[12]);
				set_style(div0, "background-image", getThumbBackground(/*activeItem*/ ctx[7]));
				set_style(div0, "transform", style_transform);
				add_location(div0, file$9, 368, 1, 9849);
				attr_dev(div1, "class", "bp-img-wrap");
				toggle_class(div1, "bp-close", /*closingWhileZoomed*/ ctx[5]);
				add_location(div1, file$9, 359, 0, 9630);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				if (if_block0) if_block0.m(div0, null);
				append_dev(div0, t);
				if (if_block1) if_block1.m(div0, null);
				current = true;

				if (!mounted) {
					dispose = [
						action_destroyer(/*onMount*/ ctx[20].call(null, div0)),
						listen_dev(div1, "wheel", /*onWheel*/ ctx[15], false, false, false, false),
						listen_dev(div1, "pointerdown", /*onPointerDown*/ ctx[16], false, false, false, false),
						listen_dev(div1, "pointermove", /*onPointerMove*/ ctx[17], false, false, false, false),
						listen_dev(div1, "pointerup", /*onPointerUp*/ ctx[19], false, false, false, false),
						listen_dev(div1, "pointercancel", /*removeEventFromCache*/ ctx[18], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (/*loaded*/ ctx[2]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);

						if (dirty[0] & /*loaded*/ 4) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_1$2(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(div0, t);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (/*showLoader*/ ctx[3]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty[0] & /*showLoader*/ 8) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block$2(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(div0, null);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}

				if (!current || dirty[0] & /*$imageDimensions*/ 1) {
					set_style(div0, "width", /*$imageDimensions*/ ctx[0][0] + "px");
				}

				if (!current || dirty[0] & /*$imageDimensions*/ 1) {
					set_style(div0, "height", /*$imageDimensions*/ ctx[0][1] + "px");
				}

				if (!current || dirty[0] & /*pointerDown*/ 16) {
					toggle_class(div0, "bp-drag", /*pointerDown*/ ctx[4]);
				}

				if (!current || dirty[0] & /*maxZoom, $imageDimensions, naturalWidth*/ 6145) {
					toggle_class(div0, "bp-canzoom", /*maxZoom*/ ctx[11] > 1 && /*$imageDimensions*/ ctx[0][0] < /*naturalWidth*/ ctx[12]);
				}

				const style_changed = dirty[0] & /*$imageDimensions*/ 1;

				if (dirty[0] & /*$imageDimensions*/ 1 || style_changed) {
					set_style(div0, "background-image", getThumbBackground(/*activeItem*/ ctx[7]));
				}

				if (dirty[0] & /*$imageDimensions, $zoomDragTranslate*/ 65 && style_transform !== (style_transform = `translate3d(${/*$imageDimensions*/ ctx[0][0] / -2 + /*$zoomDragTranslate*/ ctx[6][0]}px, ${/*$imageDimensions*/ ctx[0][1] / -2 + /*$zoomDragTranslate*/ ctx[6][1]}px, 0)`) || style_changed) {
					set_style(div0, "transform", style_transform);
				}

				if (!current || dirty[0] & /*closingWhileZoomed*/ 32) {
					toggle_class(div1, "bp-close", /*closingWhileZoomed*/ ctx[5]);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block0);
				transition_in(if_block1);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block0);
				transition_out(if_block1);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$9.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$9($$self, $$props, $$invalidate) {
		let $zoomed;
		let $zoomDragTranslate;
		let $closing;
		let $imageDimensions;
		validate_store(closing, 'closing');
		component_subscribe($$self, closing, $$value => $$invalidate(26, $closing = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Image', slots, []);
		let { props } = $$props;
		let { smallScreen } = $$props;
		let { activeItem, opts, prev, next, zoomed, container } = props;
		validate_store(zoomed, 'zoomed');
		component_subscribe($$self, zoomed, value => $$invalidate(25, $zoomed = value));
		let maxZoom = activeItem.maxZoom || opts.maxZoom || 10;
		let calculatedDimensions = props.calculateDimensions(activeItem);

		/** value of sizes attribute */
		let sizes = calculatedDimensions[0];

		/** tracks load state of image */
		let loaded, showLoader;

		/** stores pinch info if multiple touch events active */
		let pinchDetails;

		/** image html element (.bp-img) */
		let bpImg;

		/** track distance for pinch events */
		let prevDiff = 0;

		let pointerDown, hasDragged;
		let dragStartX, dragStartY;

		/** zoomDragTranslate values on start of drag */
		let dragStartTranslateX, dragStartTranslateY;

		/** if true, adds class to .bp-wrap to avoid image cropping */
		let closingWhileZoomed;

		const naturalWidth = +activeItem.width;

		/** store positions for drag inertia */
		const dragPositions = [];

		/** cache pointer events to handle pinch */
		const pointerCache = new Map();

		/** tween to control image size */
		const imageDimensions = tweened(calculatedDimensions, defaultTweenOptions(400));

		validate_store(imageDimensions, 'imageDimensions');
		component_subscribe($$self, imageDimensions, value => $$invalidate(0, $imageDimensions = value));

		/** translate transform for pointerDown */
		const zoomDragTranslate = tweened([0, 0], defaultTweenOptions(400));

		validate_store(zoomDragTranslate, 'zoomDragTranslate');
		component_subscribe($$self, zoomDragTranslate, value => $$invalidate(6, $zoomDragTranslate = value));

		/** calculate translate position with bounds */
		const boundTranslateValues = ([x, y], newDimensions = $imageDimensions) => {
			// image drag translate bounds
			const maxTranslateX = (newDimensions[0] - container.w) / 2;

			const maxTranslateY = (newDimensions[1] - container.h) / 2;

			// x max drag
			if (maxTranslateX < 0) {
				x = 0;
			} else if (x > maxTranslateX) {
				if (smallScreen) {
					// bound to left side (allow slight over drag)
					x = pointerDown
					? maxTranslateX + (x - maxTranslateX) / 10
					: maxTranslateX;

					// previous item if dragged past threshold
					if (x > maxTranslateX + 20) {
						// pointerdown = undefined to stop pointermove from running again
						$$invalidate(4, pointerDown = prev());
					}
				} else {
					x = maxTranslateX;
				}
			} else if (x < -maxTranslateX) {
				// bound to right side (allow slight over drag)
				if (smallScreen) {
					x = pointerDown
					? -maxTranslateX - (-maxTranslateX - x) / 10
					: -maxTranslateX;

					// next item if dragged past threshold
					if (x < -maxTranslateX - 20) {
						// pointerdown = undefined to stop pointermove from running again
						$$invalidate(4, pointerDown = next());
					}
				} else {
					x = -maxTranslateX;
				}
			}

			// y max drag
			if (maxTranslateY < 0) {
				y = 0;
			} else if (y > maxTranslateY) {
				y = maxTranslateY;
			} else if (y < -maxTranslateY) {
				y = -maxTranslateY;
			}

			return [x, y];
		};

		/** updates zoom level in or out based on amt value */
		function changeZoom(amt = maxZoom, e) {
			if ($closing) {
				return;
			}

			const maxWidth = calculatedDimensions[0] * maxZoom;
			let newWidth = $imageDimensions[0] + $imageDimensions[0] * amt;
			let newHeight = $imageDimensions[1] + $imageDimensions[1] * amt;

			if (amt > 0) {
				if (newWidth > maxWidth) {
					// requesting size large than max zoom
					newWidth = maxWidth;

					newHeight = calculatedDimensions[1] * maxZoom;
				}

				if (newWidth > naturalWidth) {
					// if requesting zoom larger than natural size
					newWidth = naturalWidth;

					newHeight = +activeItem.height;
				}
			} else if (newWidth < calculatedDimensions[0]) {
				// if requesting image smaller than starting size
				imageDimensions.set(calculatedDimensions);

				return zoomDragTranslate.set([0, 0]);
			}

			let { x, y, width, height } = bpImg.getBoundingClientRect();

			// distance clicked from center of image
			const offsetX = e ? e.clientX - x - width / 2 : 0;

			const offsetY = e ? e.clientY - y - height / 2 : 0;
			x = -offsetX * (newWidth / width) + offsetX;
			y = -offsetY * (newHeight / height) + offsetY;
			const newDimensions = [newWidth, newHeight];

			// set new dimensions and update sizes property
			imageDimensions.set(newDimensions).then(() => {
				$$invalidate(1, sizes = Math.round(Math.max(sizes, newWidth)));
			});

			// update translate value
			zoomDragTranslate.set(boundTranslateValues([$zoomDragTranslate[0] + x, $zoomDragTranslate[1] + y], newDimensions));
		}

		// allow zoom to be read / set externally
		Object.defineProperty(activeItem, 'zoom', {
			configurable: true,
			get: () => $zoomed,
			set: bool => changeZoom(bool ? maxZoom : -maxZoom)
		});

		const onWheel = e => {
			// return if scrolling past inline gallery w/ wheel
			if (opts.inline && !$zoomed) {
				return;
			}

			// preventDefault to stop scrolling on zoomed inline image
			e.preventDefault();

			// change zoom on wheel
			changeZoom(e.deltaY / -300, e);
		};

		/** on drag start, store initial position and image translate values */
		const onPointerDown = e => {
			// don't run if right click
			if (e.button !== 2) {
				e.preventDefault();
				$$invalidate(4, pointerDown = true);
				pointerCache.set(e.pointerId, e);
				dragStartX = e.clientX;
				dragStartY = e.clientY;
				dragStartTranslateX = $zoomDragTranslate[0];
				dragStartTranslateY = $zoomDragTranslate[1];
			}
		};

		/** on drag, update image translate val */
		const onPointerMove = e => {
			if (pointerCache.size > 1) {
				// if multiple pointer events, pass to handlePinch function
				$$invalidate(4, pointerDown = false);

				return opts.noPinch?.(container.el) || handlePinch(e);
			}

			if (!pointerDown) {
				return;
			}

			let x = e.clientX;
			let y = e.clientY;

			// store positions in dragPositions for inertia
			// set hasDragged if > 2 pointer move events
			hasDragged = dragPositions.push({ x, y }) > 2;

			// overall drag diff from start location
			x = x - dragStartX;

			y = y - dragStartY;

			// handle unzoomed left / right / up swipes
			if (!$zoomed) {
				// close if swipe up
				if (y < -90) {
					$$invalidate(4, pointerDown = !opts.noClose && props.close());
				}

				// only handle left / right if not swiping vertically
				if (Math.abs(y) < 30) {
					// previous if swipe left
					if (x > 40) {
						// pointerdown = undefined to stop pointermove from running again
						$$invalidate(4, pointerDown = prev());
					}

					// next if swipe right
					if (x < -40) {
						// pointerdown = undefined to stop pointermove from running again
						$$invalidate(4, pointerDown = next());
					}
				}
			}

			// image drag when zoomed
			if ($zoomed && hasDragged && !$closing) {
				zoomDragTranslate.set(boundTranslateValues([dragStartTranslateX + x, dragStartTranslateY + y]), { duration: 0 });
			}
		};

		const handlePinch = e => {
			// update event in cache and get values
			const [p1, p2] = pointerCache.set(e.pointerId, e).values();

			// Calculate the distance between the two pointers
			const dx = p1.clientX - p2.clientX;

			const dy = p1.clientY - p2.clientY;
			const curDiff = Math.hypot(dx, dy);

			// cache the original pinch center
			pinchDetails = pinchDetails || {
				clientX: (p1.clientX + p2.clientX) / 2,
				clientY: (p1.clientY + p2.clientY) / 2
			};

			// scale image
			changeZoom(((prevDiff || curDiff) - curDiff) / -35, pinchDetails);

			// Cache the distance for the next move event
			prevDiff = curDiff;
		};

		/** remove event from pointer event cache */
		const removeEventFromCache = e => pointerCache.delete(e.pointerId);

		function onPointerUp(e) {
			removeEventFromCache(e);

			if (pinchDetails) {
				// reset prevDiff and clear pointerDown to trigger return below
				$$invalidate(4, pointerDown = prevDiff = 0);

				// set pinchDetails to null after last finger lifts
				pinchDetails = pointerCache.size ? pinchDetails : null;
			}

			// make sure pointer events don't carry over to next image
			if (!pointerDown) {
				return;
			}

			$$invalidate(4, pointerDown = false);

			// close if overlay is clicked
			if (e.target === this && !opts.noClose) {
				return props.close();
			}

			// add drag inertia / snap back to bounds
			if (hasDragged) {
				const [posOne, posTwo, posThree] = dragPositions.slice(-3);
				const xDiff = posTwo.x - posThree.x;
				const yDiff = posTwo.y - posThree.y;

				if (Math.hypot(xDiff, yDiff) > 5) {
					zoomDragTranslate.set(boundTranslateValues([
						$zoomDragTranslate[0] - (posOne.x - posThree.x) * 5,
						$zoomDragTranslate[1] - (posOne.y - posThree.y) * 5
					]));
				}
			} else if (!opts.onImageClick?.(container.el, activeItem)) {
				changeZoom($zoomed ? -maxZoom : maxZoom, e);
			}

			// reset pointer states
			hasDragged = false;

			// reset dragPositions
			dragPositions.length = 0;
		}

		const onMount = node => {
			bpImg = node;

			// handle window resize
			props.setResizeFunc(() => {
				$$invalidate(24, calculatedDimensions = props.calculateDimensions(activeItem));

				// adjust image size / zoom on resize, but not on mobile because
				// some browsers (ios safari 15) constantly resize screen on drag
				if (opts.inline || !smallScreen) {
					imageDimensions.set(calculatedDimensions);
					zoomDragTranslate.set([0, 0]);
				}
			});

			// decode initial image before rendering
			props.loadImage(activeItem).then(() => {
				$$invalidate(2, loaded = true);
				props.preloadNext();
			});

			// show loading indicator if needed
			setTimeout(
				() => {
					$$invalidate(3, showLoader = !loaded);
				},
				250
			);
		};

		const addSrc = node => {
			addAttributes(node, activeItem.attr);
			node.srcset = activeItem.img;
		};

		$$self.$$.on_mount.push(function () {
			if (props === undefined && !('props' in $$props || $$self.$$.bound[$$self.$$.props['props']])) {
				console.warn("<Image> was created without expected prop 'props'");
			}

			if (smallScreen === undefined && !('smallScreen' in $$props || $$self.$$.bound[$$self.$$.props['smallScreen']])) {
				console.warn("<Image> was created without expected prop 'smallScreen'");
			}
		});

		const writable_props = ['props', 'smallScreen'];

		Object_1.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Image> was created with unknown prop '${key}'`);
		});

		const error_handler = error => opts.onError?.(container, activeItem, error);

		$$self.$$set = $$props => {
			if ('props' in $$props) $$invalidate(22, props = $$props.props);
			if ('smallScreen' in $$props) $$invalidate(23, smallScreen = $$props.smallScreen);
		};

		$$self.$capture_state = () => ({
			tweened,
			addAttributes,
			closing,
			defaultTweenOptions,
			getThumbBackground,
			fly,
			Loading,
			props,
			smallScreen,
			activeItem,
			opts,
			prev,
			next,
			zoomed,
			container,
			maxZoom,
			calculatedDimensions,
			sizes,
			loaded,
			showLoader,
			pinchDetails,
			bpImg,
			prevDiff,
			pointerDown,
			hasDragged,
			dragStartX,
			dragStartY,
			dragStartTranslateX,
			dragStartTranslateY,
			closingWhileZoomed,
			naturalWidth,
			dragPositions,
			pointerCache,
			imageDimensions,
			zoomDragTranslate,
			boundTranslateValues,
			changeZoom,
			onWheel,
			onPointerDown,
			onPointerMove,
			handlePinch,
			removeEventFromCache,
			onPointerUp,
			onMount,
			addSrc,
			$zoomed,
			$zoomDragTranslate,
			$closing,
			$imageDimensions
		});

		$$self.$inject_state = $$props => {
			if ('props' in $$props) $$invalidate(22, props = $$props.props);
			if ('smallScreen' in $$props) $$invalidate(23, smallScreen = $$props.smallScreen);
			if ('activeItem' in $$props) $$invalidate(7, activeItem = $$props.activeItem);
			if ('opts' in $$props) $$invalidate(8, opts = $$props.opts);
			if ('prev' in $$props) prev = $$props.prev;
			if ('next' in $$props) next = $$props.next;
			if ('zoomed' in $$props) $$invalidate(9, zoomed = $$props.zoomed);
			if ('container' in $$props) $$invalidate(10, container = $$props.container);
			if ('maxZoom' in $$props) $$invalidate(11, maxZoom = $$props.maxZoom);
			if ('calculatedDimensions' in $$props) $$invalidate(24, calculatedDimensions = $$props.calculatedDimensions);
			if ('sizes' in $$props) $$invalidate(1, sizes = $$props.sizes);
			if ('loaded' in $$props) $$invalidate(2, loaded = $$props.loaded);
			if ('showLoader' in $$props) $$invalidate(3, showLoader = $$props.showLoader);
			if ('pinchDetails' in $$props) pinchDetails = $$props.pinchDetails;
			if ('bpImg' in $$props) bpImg = $$props.bpImg;
			if ('prevDiff' in $$props) prevDiff = $$props.prevDiff;
			if ('pointerDown' in $$props) $$invalidate(4, pointerDown = $$props.pointerDown);
			if ('hasDragged' in $$props) hasDragged = $$props.hasDragged;
			if ('dragStartX' in $$props) dragStartX = $$props.dragStartX;
			if ('dragStartY' in $$props) dragStartY = $$props.dragStartY;
			if ('dragStartTranslateX' in $$props) dragStartTranslateX = $$props.dragStartTranslateX;
			if ('dragStartTranslateY' in $$props) dragStartTranslateY = $$props.dragStartTranslateY;
			if ('closingWhileZoomed' in $$props) $$invalidate(5, closingWhileZoomed = $$props.closingWhileZoomed);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty[0] & /*$imageDimensions, calculatedDimensions*/ 16777217) {
				zoomed.set($imageDimensions[0] - 10 > calculatedDimensions[0]);
			}

			if ($$self.$$.dirty[0] & /*$closing, $zoomed, calculatedDimensions*/ 117440512) {
				// if zoomed while closing, zoom out image and add class
				// to change contain value on .bp-wrap to avoid cropping
				if ($closing && $zoomed && !opts.intro) {
					const closeTweenOpts = defaultTweenOptions(480);
					zoomDragTranslate.set([0, 0], closeTweenOpts);
					imageDimensions.set(calculatedDimensions, closeTweenOpts);
					$$invalidate(5, closingWhileZoomed = true);
				}
			}
		};

		return [
			$imageDimensions,
			sizes,
			loaded,
			showLoader,
			pointerDown,
			closingWhileZoomed,
			$zoomDragTranslate,
			activeItem,
			opts,
			zoomed,
			container,
			maxZoom,
			naturalWidth,
			imageDimensions,
			zoomDragTranslate,
			onWheel,
			onPointerDown,
			onPointerMove,
			removeEventFromCache,
			onPointerUp,
			onMount,
			addSrc,
			props,
			smallScreen,
			calculatedDimensions,
			$zoomed,
			$closing,
			error_handler
		];
	}

	class Image extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$9, create_fragment$9, safe_not_equal, { props: 22, smallScreen: 23 }, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Image",
				options,
				id: create_fragment$9.name
			});
		}

		get props() {
			throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set props(value) {
			throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get smallScreen() {
			throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set smallScreen(value) {
			throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/bigger-picture/src/components/iframe.svelte generated by Svelte v4.2.8 */
	const file$8 = "node_modules/bigger-picture/src/components/iframe.svelte";

	function create_fragment$8(ctx) {
		let div;
		let iframe;
		let t;
		let loading;
		let current;
		let mounted;
		let dispose;

		loading = new Loading({
				props: {
					activeItem: /*activeItem*/ ctx[2],
					loaded: /*loaded*/ ctx[0]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				div = element("div");
				iframe = element("iframe");
				t = space();
				create_component(loading.$$.fragment);
				attr_dev(iframe, "allow", "autoplay; fullscreen");
				attr_dev(iframe, "title", /*activeItem*/ ctx[2].title);
				add_location(iframe, file$8, 30, 1, 509);
				attr_dev(div, "class", "bp-if");
				set_style(div, "width", /*dimensions*/ ctx[1][0] + "px");
				set_style(div, "height", /*dimensions*/ ctx[1][1] + "px");
				add_location(div, file$8, 23, 0, 420);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, iframe);
				append_dev(div, t);
				mount_component(loading, div, null);
				current = true;

				if (!mounted) {
					dispose = [
						action_destroyer(/*addSrc*/ ctx[3].call(null, iframe)),
						listen_dev(iframe, "load", /*load_handler*/ ctx[5], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const loading_changes = {};
				if (dirty & /*loaded*/ 1) loading_changes.loaded = /*loaded*/ ctx[0];
				loading.$set(loading_changes);

				if (!current || dirty & /*dimensions*/ 2) {
					set_style(div, "width", /*dimensions*/ ctx[1][0] + "px");
				}

				if (!current || dirty & /*dimensions*/ 2) {
					set_style(div, "height", /*dimensions*/ ctx[1][1] + "px");
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(loading.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(loading.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(loading);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$8.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$8($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Iframe', slots, []);
		let { props } = $$props;
		let loaded, dimensions;
		const { activeItem } = props;
		const setDimensions = () => $$invalidate(1, dimensions = props.calculateDimensions(activeItem));
		setDimensions();
		props.setResizeFunc(setDimensions);

		const addSrc = node => {
			addAttributes(node, activeItem.attr);
			node.src = activeItem.iframe;
		};

		$$self.$$.on_mount.push(function () {
			if (props === undefined && !('props' in $$props || $$self.$$.bound[$$self.$$.props['props']])) {
				console.warn("<Iframe> was created without expected prop 'props'");
			}
		});

		const writable_props = ['props'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Iframe> was created with unknown prop '${key}'`);
		});

		const load_handler = () => $$invalidate(0, loaded = true);

		$$self.$$set = $$props => {
			if ('props' in $$props) $$invalidate(4, props = $$props.props);
		};

		$$self.$capture_state = () => ({
			addAttributes,
			Loading,
			props,
			loaded,
			dimensions,
			activeItem,
			setDimensions,
			addSrc
		});

		$$self.$inject_state = $$props => {
			if ('props' in $$props) $$invalidate(4, props = $$props.props);
			if ('loaded' in $$props) $$invalidate(0, loaded = $$props.loaded);
			if ('dimensions' in $$props) $$invalidate(1, dimensions = $$props.dimensions);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [loaded, dimensions, activeItem, addSrc, props, load_handler];
	}

	class Iframe extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { props: 4 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Iframe",
				options,
				id: create_fragment$8.name
			});
		}

		get props() {
			throw new Error("<Iframe>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set props(value) {
			throw new Error("<Iframe>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/bigger-picture/src/components/video.svelte generated by Svelte v4.2.8 */
	const file$7 = "node_modules/bigger-picture/src/components/video.svelte";

	function create_fragment$7(ctx) {
		let div;
		let loading;
		let current;
		let mounted;
		let dispose;

		loading = new Loading({
				props: {
					activeItem: /*activeItem*/ ctx[2],
					loaded: /*loaded*/ ctx[0]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				div = element("div");
				create_component(loading.$$.fragment);
				attr_dev(div, "class", "bp-vid");
				set_style(div, "width", /*dimensions*/ ctx[1][0] + "px");
				set_style(div, "height", /*dimensions*/ ctx[1][1] + "px");
				set_style(div, "background-image", getThumbBackground(/*activeItem*/ ctx[2]));
				add_location(div, file$7, 62, 0, 1636);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(loading, div, null);
				current = true;

				if (!mounted) {
					dispose = action_destroyer(/*onMount*/ ctx[3].call(null, div));
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				const loading_changes = {};
				if (dirty & /*loaded*/ 1) loading_changes.loaded = /*loaded*/ ctx[0];
				loading.$set(loading_changes);

				if (!current || dirty & /*dimensions*/ 2) {
					set_style(div, "width", /*dimensions*/ ctx[1][0] + "px");
				}

				if (!current || dirty & /*dimensions*/ 2) {
					set_style(div, "height", /*dimensions*/ ctx[1][1] + "px");
				}

				const style_changed = dirty & /*dimensions*/ 2;

				if (dirty & /*dimensions*/ 2 || style_changed) {
					set_style(div, "background-image", getThumbBackground(/*activeItem*/ ctx[2]));
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(loading.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(loading.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(loading);
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$7.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$7($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Video', slots, []);
		let { props } = $$props;
		let loaded, dimensions;
		const { activeItem, opts, container } = props;
		const setDimensions = () => $$invalidate(1, dimensions = props.calculateDimensions(activeItem));
		setDimensions();
		props.setResizeFunc(setDimensions);

		/** create audo / video element */
		const onMount = node => {
			let mediaElement;

			/** takes supplied object and creates elements in video */
			const appendToVideo = (tag, arr) => {
				if (!Array.isArray(arr)) {
					arr = JSON.parse(arr);
				}

				for (const obj of arr) {
					// create media element if it doesn't exist
					if (!mediaElement) {
						mediaElement = document.createElement((obj.type?.includes('audio')) ? 'audio' : 'video');

						addAttributes(mediaElement, {
							controls: true,
							autoplay: true,
							playsinline: true,
							tabindex: '0'
						});

						addAttributes(mediaElement, activeItem.attr);
					}

					// add sources / tracks to media element
					const el = document.createElement(tag);

					addAttributes(el, obj);

					if (tag == 'source') {
						el.onError = error => opts.onError?.(container, activeItem, error);
					}

					mediaElement.append(el);
				}
			};

			appendToVideo('source', activeItem.sources);
			appendToVideo('track', activeItem.tracks || []);
			mediaElement.oncanplay = () => $$invalidate(0, loaded = true);
			node.append(mediaElement);
		};

		$$self.$$.on_mount.push(function () {
			if (props === undefined && !('props' in $$props || $$self.$$.bound[$$self.$$.props['props']])) {
				console.warn("<Video> was created without expected prop 'props'");
			}
		});

		const writable_props = ['props'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Video> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('props' in $$props) $$invalidate(4, props = $$props.props);
		};

		$$self.$capture_state = () => ({
			Loading,
			addAttributes,
			getThumbBackground,
			props,
			loaded,
			dimensions,
			activeItem,
			opts,
			container,
			setDimensions,
			onMount
		});

		$$self.$inject_state = $$props => {
			if ('props' in $$props) $$invalidate(4, props = $$props.props);
			if ('loaded' in $$props) $$invalidate(0, loaded = $$props.loaded);
			if ('dimensions' in $$props) $$invalidate(1, dimensions = $$props.dimensions);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [loaded, dimensions, activeItem, onMount, props];
	}

	class Video extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, { props: 4 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Video",
				options,
				id: create_fragment$7.name
			});
		}

		get props() {
			throw new Error("<Video>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set props(value) {
			throw new Error("<Video>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* node_modules/bigger-picture/src/bigger-picture.svelte generated by Svelte v4.2.8 */
	const file$6 = "node_modules/bigger-picture/src/bigger-picture.svelte";

	// (298:0) {#if items}
	function create_if_block$1(ctx) {
		let div2;
		let div0;
		let div0_outro;
		let t0;
		let previous_key = /*activeItem*/ ctx[6].i;
		let t1;
		let div1;
		let button;
		let t2;
		let div1_outro;
		let current;
		let mounted;
		let dispose;
		let key_block = create_key_block(ctx);
		let if_block = /*items*/ ctx[0].length > 1 && create_if_block_1$1(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				t0 = space();
				key_block.c();
				t1 = space();
				div1 = element("div");
				button = element("button");
				t2 = space();
				if (if_block) if_block.c();
				add_location(div0, file$6, 306, 2, 8225);
				attr_dev(button, "class", "bp-x");
				attr_dev(button, "title", "Close");
				attr_dev(button, "aria-label", "Close");
				add_location(button, file$6, 341, 3, 9236);
				attr_dev(div1, "class", "bp-controls");
				add_location(div1, file$6, 339, 2, 9168);
				attr_dev(div2, "class", "bp-wrap");
				toggle_class(div2, "bp-zoomed", /*$zoomed*/ ctx[10]);
				toggle_class(div2, "bp-inline", /*inline*/ ctx[8]);
				toggle_class(div2, "bp-small", /*smallScreen*/ ctx[7]);
				toggle_class(div2, "bp-noclose", /*opts*/ ctx[5].noClose);
				add_location(div2, file$6, 298, 1, 8054);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div2, t0);
				key_block.m(div2, null);
				append_dev(div2, t1);
				append_dev(div2, div1);
				append_dev(div1, button);
				append_dev(div1, t2);
				if (if_block) if_block.m(div1, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button, "click", /*close*/ ctx[1], false, false, false, false),
						action_destroyer(/*containerActions*/ ctx[14].call(null, div2))
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*activeItem*/ 64 && not_equal(previous_key, previous_key = /*activeItem*/ ctx[6].i)) {
					group_outros();
					transition_out(key_block, 1, 1, noop);
					check_outros();
					key_block = create_key_block(ctx);
					key_block.c();
					transition_in(key_block, 1);
					key_block.m(div2, t1);
				} else {
					key_block.p(ctx, dirty);
				}

				if (/*items*/ ctx[0].length > 1) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1$1(ctx);
						if_block.c();
						if_block.m(div1, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (!current || dirty[0] & /*$zoomed*/ 1024) {
					toggle_class(div2, "bp-zoomed", /*$zoomed*/ ctx[10]);
				}

				if (!current || dirty[0] & /*inline*/ 256) {
					toggle_class(div2, "bp-inline", /*inline*/ ctx[8]);
				}

				if (!current || dirty[0] & /*smallScreen*/ 128) {
					toggle_class(div2, "bp-small", /*smallScreen*/ ctx[7]);
				}

				if (!current || dirty[0] & /*opts*/ 32) {
					toggle_class(div2, "bp-noclose", /*opts*/ ctx[5].noClose);
				}
			},
			i: function intro(local) {
				if (current) return;
				if (div0_outro) div0_outro.end(1);
				transition_in(key_block);
				if (div1_outro) div1_outro.end(1);
				current = true;
			},
			o: function outro(local) {
				if (local) {
					div0_outro = create_out_transition(div0, fly, { duration: 480 });
				}

				transition_out(key_block);

				if (local) {
					div1_outro = create_out_transition(div1, fly, {});
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				if (detaching && div0_outro) div0_outro.end();
				key_block.d(detaching);
				if (if_block) if_block.d();
				if (detaching && div1_outro) div1_outro.end();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(298:0) {#if items}",
			ctx
		});

		return block;
	}

	// (327:4) {:else}
	function create_else_block(ctx) {
		let div;
		let raw_value = (/*activeItem*/ ctx[6].html ?? /*activeItem*/ ctx[6].element.outerHTML) + "";

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "bp-html");
				add_location(div, file$6, 327, 5, 8900);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				div.innerHTML = raw_value;
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*activeItem*/ 64 && raw_value !== (raw_value = (/*activeItem*/ ctx[6].html ?? /*activeItem*/ ctx[6].element.outerHTML) + "")) div.innerHTML = raw_value;		},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(327:4) {:else}",
			ctx
		});

		return block;
	}

	// (325:32) 
	function create_if_block_5$1(ctx) {
		let iframe;
		let current;

		iframe = new Iframe({
				props: { props: /*getChildProps*/ ctx[13]() },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(iframe.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(iframe, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(iframe.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(iframe.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(iframe, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5$1.name,
			type: "if",
			source: "(325:32) ",
			ctx
		});

		return block;
	}

	// (323:33) 
	function create_if_block_4$1(ctx) {
		let video;
		let current;

		video = new Video({
				props: { props: /*getChildProps*/ ctx[13]() },
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(video.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(video, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(video.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(video.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(video, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4$1.name,
			type: "if",
			source: "(323:33) ",
			ctx
		});

		return block;
	}

	// (321:4) {#if activeItem.img}
	function create_if_block_3$1(ctx) {
		let imageitem;
		let current;

		imageitem = new Image({
				props: {
					props: /*getChildProps*/ ctx[13](),
					smallScreen: /*smallScreen*/ ctx[7]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(imageitem.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(imageitem, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const imageitem_changes = {};
				if (dirty[0] & /*smallScreen*/ 128) imageitem_changes.smallScreen = /*smallScreen*/ ctx[7];
				imageitem.$set(imageitem_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(imageitem.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(imageitem.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(imageitem, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$1.name,
			type: "if",
			source: "(321:4) {#if activeItem.img}",
			ctx
		});

		return block;
	}

	// (333:3) {#if activeItem.caption}
	function create_if_block_2$1(ctx) {
		let div;
		let raw_value = /*activeItem*/ ctx[6].caption + "";
		let div_outro;
		let current;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "bp-cap");
				add_location(div, file$6, 333, 4, 9048);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				div.innerHTML = raw_value;
				current = true;
			},
			p: function update(ctx, dirty) {
				if ((!current || dirty[0] & /*activeItem*/ 64) && raw_value !== (raw_value = /*activeItem*/ ctx[6].caption + "")) div.innerHTML = raw_value;		},
			i: function intro(local) {
				if (current) return;
				if (div_outro) div_outro.end(1);
				current = true;
			},
			o: function outro(local) {
				div_outro = create_out_transition(div, fly, { duration: 200 });
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (detaching && div_outro) div_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$1.name,
			type: "if",
			source: "(333:3) {#if activeItem.caption}",
			ctx
		});

		return block;
	}

	// (308:2) {#key activeItem.i}
	function create_key_block(ctx) {
		let div;
		let current_block_type_index;
		let if_block0;
		let div_intro;
		let div_outro;
		let t;
		let if_block1_anchor;
		let current;
		let mounted;
		let dispose;
		const if_block_creators = [create_if_block_3$1, create_if_block_4$1, create_if_block_5$1, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*activeItem*/ ctx[6].img) return 0;
			if (/*activeItem*/ ctx[6].sources) return 1;
			if (/*activeItem*/ ctx[6].iframe) return 2;
			return 3;
		}

		current_block_type_index = select_block_type(ctx);
		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		let if_block1 = /*activeItem*/ ctx[6].caption && create_if_block_2$1(ctx);

		const block = {
			c: function create() {
				div = element("div");
				if_block0.c();
				t = space();
				if (if_block1) if_block1.c();
				if_block1_anchor = empty();
				attr_dev(div, "class", "bp-inner");
				add_location(div, file$6, 308, 3, 8292);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				insert_dev(target, t, anchor);
				if (if_block1) if_block1.m(target, anchor);
				insert_dev(target, if_block1_anchor, anchor);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(div, "pointerdown", /*pointerdown_handler*/ ctx[20], false, false, false, false),
						listen_dev(div, "pointerup", /*pointerup_handler*/ ctx[21], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block0 = if_blocks[current_block_type_index];

					if (!if_block0) {
						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block0.c();
					} else {
						if_block0.p(ctx, dirty);
					}

					transition_in(if_block0, 1);
					if_block0.m(div, null);
				}

				if (/*activeItem*/ ctx[6].caption) {
					if (if_block1) {
						if_block1.p(ctx, dirty);

						if (dirty[0] & /*activeItem*/ 64) {
							transition_in(if_block1, 1);
						}
					} else {
						if_block1 = create_if_block_2$1(ctx);
						if_block1.c();
						transition_in(if_block1, 1);
						if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
					}
				} else if (if_block1) {
					group_outros();

					transition_out(if_block1, 1, 1, () => {
						if_block1 = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block0);

				add_render_callback(() => {
					if (!current) return;
					if (div_outro) div_outro.end(1);
					div_intro = create_in_transition(div, /*mediaTransition*/ ctx[12], true);
					div_intro.start();
				});

				transition_in(if_block1);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block0);
				if (div_intro) div_intro.invalidate();
				div_outro = create_out_transition(div, /*mediaTransition*/ ctx[12], false);
				transition_out(if_block1);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
					detach_dev(t);
					detach_dev(if_block1_anchor);
				}

				if_blocks[current_block_type_index].d();
				if (detaching && div_outro) div_outro.end();
				if (if_block1) if_block1.d(detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_key_block.name,
			type: "key",
			source: "(308:2) {#key activeItem.i}",
			ctx
		});

		return block;
	}

	// (344:3) {#if items.length > 1}
	function create_if_block_1$1(ctx) {
		let div;
		let raw_value = `${/*position*/ ctx[4] + 1} / ${/*items*/ ctx[0].length}` + "";
		let t0;
		let button0;
		let t1;
		let button1;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div = element("div");
				t0 = space();
				button0 = element("button");
				t1 = space();
				button1 = element("button");
				attr_dev(div, "class", "bp-count");
				add_location(div, file$6, 345, 4, 9362);
				attr_dev(button0, "class", "bp-prev");
				attr_dev(button0, "title", "Previous");
				attr_dev(button0, "aria-label", "Previous");
				add_location(button0, file$6, 349, 4, 9484);
				attr_dev(button1, "class", "bp-next");
				attr_dev(button1, "title", "Next");
				attr_dev(button1, "aria-label", "Next");
				add_location(button1, file$6, 355, 4, 9594);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				div.innerHTML = raw_value;
				insert_dev(target, t0, anchor);
				insert_dev(target, button0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, button1, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*prev*/ ctx[2], false, false, false, false),
						listen_dev(button1, "click", /*next*/ ctx[3], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*position, items*/ 17 && raw_value !== (raw_value = `${/*position*/ ctx[4] + 1} / ${/*items*/ ctx[0].length}` + "")) div.innerHTML = raw_value;		},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
					detach_dev(t0);
					detach_dev(button0);
					detach_dev(t1);
					detach_dev(button1);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$1.name,
			type: "if",
			source: "(344:3) {#if items.length > 1}",
			ctx
		});

		return block;
	}

	function create_fragment$6(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*items*/ ctx[0] && create_if_block$1(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*items*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty[0] & /*items*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$6.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$6($$self, $$props, $$invalidate) {
		let $zoomed;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Bigger_picture', slots, []);
		let { items = undefined } = $$props;
		let { target = undefined } = $$props;
		const html = document.documentElement;

		/** index of current active item */
		let position;

		/** options passed via open method */
		let opts;

		/** bool tracks open state */
		let isOpen;

		/** dom element to restore focus to on close */
		let focusTrigger;

		/** bool true if container width < 769 */
		let smallScreen;

		/** bool value of inline option passed in open method */
		let inline;

		/** when position is set */
		let movement;

		/** stores target on pointerdown (ref for overlay close) */
		let clickedEl;

		/** active item object */
		let activeItem;

		/** returns true if `activeItem` is html */
		const activeItemIsHtml = () => !activeItem.img && !activeItem.sources && !activeItem.iframe;

		/** function set by child component to run when container resized */
		let resizeFunc;

		/** used by child components to set resize function */
		const setResizeFunc = fn => resizeFunc = fn;

		/** container element (el) / width (w) / height (h) */
		const container = {};

		// /** true if image is currently zoomed past starting size */
		const zoomed = writable(0);

		validate_store(zoomed, 'zoomed');
		component_subscribe($$self, zoomed, value => $$invalidate(10, $zoomed = value));

		const open = options => {
			$$invalidate(5, opts = options);
			$$invalidate(8, inline = opts.inline);

			// add class to hide scroll if not inline gallery
			if (!inline && html.scrollHeight > html.clientHeight) {
				html.classList.add('bp-lock');
			}

			// update trigger element to restore focus
			focusTrigger = document.activeElement;

			$$invalidate(19, container.w = target.offsetWidth, container);

			$$invalidate(
				19,
				container.h = target === document.body
				? window.innerHeight
				: target.clientHeight,
				container
			);

			$$invalidate(7, smallScreen = container.w < 769);
			$$invalidate(4, position = opts.position || 0);

			// set items
			$$invalidate(0, items = []);

			for (let i = 0; i < (opts.items.length || 1); i++) {
				let item = opts.items[i] || opts.items;

				if ('dataset' in item) {
					items.push({ element: item, i, ...item.dataset });
				} else {
					item.i = i;
					items.push(item);

					// set item to element for position check below
					item = item.element;
				}

				// override gallery position if needed
				if (opts.el && opts.el === item) {
					$$invalidate(4, position = i);
				}
			}
		};

		const close = () => {
			opts.onClose?.(container.el, activeItem);
			closing.set(true);
			$$invalidate(0, items = null);

			// restore focus to trigger element
			focusTrigger?.focus({ preventScroll: true });
		};

		const prev = () => setPosition(position - 1);
		const next = () => setPosition(position + 1);

		const setPosition = index => {
			movement = index - position;
			$$invalidate(4, position = getNextPosition(index));
		};

		/**
	 * returns next gallery position (looped if neccessary)
	 * @param {number} index
	 */
		const getNextPosition = index => (index + items.length) % items.length;

		const onKeydown = e => {
			const { key, shiftKey } = e;

			if (key === 'Escape') {
				!opts.noClose && close();
			} else if (key === 'ArrowRight') {
				next();
			} else if (key === 'ArrowLeft') {
				prev();
			} else if (key === 'Tab') {
				// trap focus on tab press
				const { activeElement } = document;

				// allow browser to handle tab into video controls only
				if (shiftKey || !activeElement.controls) {
					e.preventDefault();
					const { focusWrap = container.el } = opts;
					const tabbable = [...focusWrap.querySelectorAll('*')].filter(node => node.tabIndex >= 0);
					let index = tabbable.indexOf(activeElement);
					index += tabbable.length + (shiftKey ? -1 : 1);
					tabbable[index % tabbable.length].focus();
				}
			}
		};

		/**
	 * calculate dimensions of height / width resized to fit within container
	 * @param {object} item object with height / width properties
	 * @returns {Array} [width: number, height: number]
	 */
		const calculateDimensions = ({ width = 1920, height = 1080 }) => {
			const { scale = 0.99 } = opts;
			const ratio = Math.min(1, container.w / width * scale, container.h / height * scale);

			// round number so we don't use a float as the sizes attribute
			return [Math.round(width * ratio), Math.round(height * ratio)];
		};

		/** preloads images for previous and next items in gallery */
		const preloadNext = () => {
			if (items) {
				const nextItem = items[getNextPosition(position + 1)];
				const prevItem = items[getNextPosition(position - 1)];
				!nextItem.preload && loadImage(nextItem);
				!prevItem.preload && loadImage(prevItem);
			}
		};

		/** loads / decodes image for item */
		const loadImage = item => {
			if (item.img) {
				const image = document.createElement('img');
				image.sizes = opts.sizes || `${calculateDimensions(item)[0]}px`;
				image.srcset = item.img;
				item.preload = true;

				return image.decode().catch(error => {
					
				});
			}
		};

		/** svelte transition to control opening / changing */
		const mediaTransition = (node, isEntering) => {
			if (!isOpen || !items) {
				// entrance / exit transition
				$$invalidate(18, isOpen = isEntering);

				return opts.intro
				? fly(node, { y: isEntering ? 10 : -10 })
				: scaleIn(node);
			}

			// forward / backward transition
			return fly(node, {
				x: (movement > 0 ? 20 : -20) * (isEntering ? 1 : -1),
				duration: 250
			});
		};

		/** custom svelte transition for entrance zoom */
		const scaleIn = node => {
			let dimensions;

			if (activeItemIsHtml()) {
				const bpItem = node.firstChild.firstChild;
				dimensions = [bpItem.clientWidth, bpItem.clientHeight];
			} else {
				dimensions = calculateDimensions(activeItem);
			}

			// rect is bounding rect of trigger element
			const rect = (activeItem.element || focusTrigger).getBoundingClientRect();

			const leftOffset = rect.left - (container.w - rect.width) / 2;
			const centerTop = rect.top - (container.h - rect.height) / 2;
			const scaleWidth = rect.width / dimensions[0];
			const scaleHeight = rect.height / dimensions[1];

			return {
				duration: 480,
				easing: cubicOut,
				css: (t, u) => {
					return `transform:translate3d(${leftOffset * u}px, ${centerTop * u}px, 0) scale3d(${scaleWidth + t * (1 - scaleWidth)}, ${scaleHeight + t * (1 - scaleHeight)}, 1)`;
				}
			};
		};

		/** provides object w/ needed funcs / data to child components  */
		const getChildProps = () => ({
			activeItem,
			calculateDimensions,
			loadImage,
			preloadNext,
			opts,
			prev,
			next,
			close,
			setResizeFunc,
			zoomed,
			container
		});

		/** code to run on mount / destroy */
		const containerActions = node => {
			$$invalidate(19, container.el = node, container);
			let roActive;
			opts.onOpen?.(container.el, activeItem);

			// don't use keyboard events for inline galleries
			if (!inline) {
				window.addEventListener('keydown', onKeydown);
			}

			// set up resize observer
			const ro = new ResizeObserver(entries => {
					// use roActive to avoid running on initial open
					if (roActive) {
						$$invalidate(19, container.w = entries[0].contentRect.width, container);
						$$invalidate(19, container.h = entries[0].contentRect.height, container);
						$$invalidate(7, smallScreen = container.w < 769);

						// run child component resize function
						if (!activeItemIsHtml()) {
							resizeFunc?.();
						}

						// run user defined onResize function
						opts.onResize?.(container.el, activeItem);
					}

					roActive = true;
				});

			ro.observe(node);

			return {
				destroy() {
					ro.disconnect();
					window.removeEventListener('keydown', onKeydown);
					closing.set(false);

					// remove class hiding scroll
					html.classList.remove('bp-lock');

					opts.onClosed?.();
				}
			};
		};

		const writable_props = ['items', 'target'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Bigger_picture> was created with unknown prop '${key}'`);
		});

		const pointerdown_handler = e => $$invalidate(9, clickedEl = e.target);

		const pointerup_handler = function (e) {
			// only close if left click on self and not dragged
			if (e.button !== 2 && e.target === this && clickedEl === this) {
				!opts.noClose && close();
			}
		};

		$$self.$$set = $$props => {
			if ('items' in $$props) $$invalidate(0, items = $$props.items);
			if ('target' in $$props) $$invalidate(15, target = $$props.target);
		};

		$$self.$capture_state = () => ({
			fly,
			cubicOut,
			ImageItem: Image,
			Iframe,
			Video,
			writable,
			closing,
			items,
			target,
			html,
			position,
			opts,
			isOpen,
			focusTrigger,
			smallScreen,
			inline,
			movement,
			clickedEl,
			activeItem,
			activeItemIsHtml,
			resizeFunc,
			setResizeFunc,
			container,
			zoomed,
			open,
			close,
			prev,
			next,
			setPosition,
			getNextPosition,
			onKeydown,
			calculateDimensions,
			preloadNext,
			loadImage,
			mediaTransition,
			scaleIn,
			getChildProps,
			containerActions,
			$zoomed
		});

		$$self.$inject_state = $$props => {
			if ('items' in $$props) $$invalidate(0, items = $$props.items);
			if ('target' in $$props) $$invalidate(15, target = $$props.target);
			if ('position' in $$props) $$invalidate(4, position = $$props.position);
			if ('opts' in $$props) $$invalidate(5, opts = $$props.opts);
			if ('isOpen' in $$props) $$invalidate(18, isOpen = $$props.isOpen);
			if ('focusTrigger' in $$props) focusTrigger = $$props.focusTrigger;
			if ('smallScreen' in $$props) $$invalidate(7, smallScreen = $$props.smallScreen);
			if ('inline' in $$props) $$invalidate(8, inline = $$props.inline);
			if ('movement' in $$props) movement = $$props.movement;
			if ('clickedEl' in $$props) $$invalidate(9, clickedEl = $$props.clickedEl);
			if ('activeItem' in $$props) $$invalidate(6, activeItem = $$props.activeItem);
			if ('resizeFunc' in $$props) resizeFunc = $$props.resizeFunc;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty[0] & /*items, position, isOpen, opts, container, activeItem*/ 786545) {
				if (items) {
					// update active item when position changes
					$$invalidate(6, activeItem = items[position]);

					if (isOpen) {
						// run onUpdate when items updated
						opts.onUpdate?.(container.el, activeItem);
					}
				}
			}
		};

		return [
			items,
			close,
			prev,
			next,
			position,
			opts,
			activeItem,
			smallScreen,
			inline,
			clickedEl,
			$zoomed,
			zoomed,
			mediaTransition,
			getChildProps,
			containerActions,
			target,
			open,
			setPosition,
			isOpen,
			container,
			pointerdown_handler,
			pointerup_handler
		];
	}

	class Bigger_picture extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(
				this,
				options,
				instance$6,
				create_fragment$6,
				not_equal,
				{
					items: 0,
					target: 15,
					open: 16,
					close: 1,
					prev: 2,
					next: 3,
					setPosition: 17
				},
				null,
				[-1, -1]
			);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Bigger_picture",
				options,
				id: create_fragment$6.name
			});
		}

		get items() {
			return this.$$.ctx[0];
		}

		set items(items) {
			this.$$set({ items });
			flush();
		}

		get target() {
			return this.$$.ctx[15];
		}

		set target(target) {
			this.$$set({ target });
			flush();
		}

		get open() {
			return this.$$.ctx[16];
		}

		set open(value) {
			throw new Error("<Bigger_picture>: Cannot set read-only property 'open'");
		}

		get close() {
			return this.$$.ctx[1];
		}

		set close(value) {
			throw new Error("<Bigger_picture>: Cannot set read-only property 'close'");
		}

		get prev() {
			return this.$$.ctx[2];
		}

		set prev(value) {
			throw new Error("<Bigger_picture>: Cannot set read-only property 'prev'");
		}

		get next() {
			return this.$$.ctx[3];
		}

		set next(value) {
			throw new Error("<Bigger_picture>: Cannot set read-only property 'next'");
		}

		get setPosition() {
			return this.$$.ctx[17];
		}

		set setPosition(value) {
			throw new Error("<Bigger_picture>: Cannot set read-only property 'setPosition'");
		}
	}

	/**
	 * Initializes BiggerPicture
	 * @param {{target: HTMLElement}} options
	 * @returns BiggerPicture instance
	 */
	function BiggerPicture (options) {
		return new Bigger_picture({
			...options,
			props: options,
		})
	}

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var macy = {exports: {}};

	macy.exports;

	(function (module, exports) {
		!function(t,n){module.exports=n();}(commonjsGlobal,function(){function t(t,n){var e=void 0;return function(){e&&clearTimeout(e),e=setTimeout(t,n);}}function n(t,n){for(var e=t.length,r=e,o=[];e--;)o.push(n(t[r-e-1]));return o}function e(t,n){var e=arguments.length>2&&void 0!==arguments[2]&&arguments[2];if(window.Promise)return A(t,n,e);t.recalculate(!0,!0);}function r(t){for(var n=t.options,e=t.responsiveOptions,r=t.keys,o=t.docWidth,i=void 0,s=0;s<r.length;s++){var a=parseInt(r[s],10);o>=a&&(i=n.breakAt[a],O(i,e));}return e}function o(t){for(var n=t.options,e=t.responsiveOptions,r=t.keys,o=t.docWidth,i=void 0,s=r.length-1;s>=0;s--){var a=parseInt(r[s],10);o<=a&&(i=n.breakAt[a],O(i,e));}return e}function i(t){var n=t.useContainerForBreakpoints?t.container.clientWidth:window.innerWidth,e={columns:t.columns};b(t.margin)?e.margin={x:t.margin.x,y:t.margin.y}:e.margin={x:t.margin,y:t.margin};var i=Object.keys(t.breakAt);return t.mobileFirst?r({options:t,responsiveOptions:e,keys:i,docWidth:n}):o({options:t,responsiveOptions:e,keys:i,docWidth:n})}function s(t){return i(t).columns}function a(t){return i(t).margin}function c(t){var n=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],e=s(t),r=a(t).x,o=100/e;if(!n)return o;if(1===e)return "100%";var i="px";if("string"==typeof r){var c=parseFloat(r);i=r.replace(c,""),r=c;}return r=(e-1)*r/e,"%"===i?o-r+"%":"calc("+o+"% - "+r+i+")"}function u(t,n){var e=s(t.options),r=0,o=void 0,i=void 0;if(1===++n)return 0;i=a(t.options).x;var u="px";if("string"==typeof i){var l=parseFloat(i,10);u=i.replace(l,""),i=l;}return o=(i-(e-1)*i/e)*(n-1),r+=c(t.options,!1)*(n-1),"%"===u?r+o+"%":"calc("+r+"% + "+o+u+")"}function l(t){var n=0,e=t.container,r=t.rows;v(r,function(t){n=t>n?t:n;}),e.style.height=n+"px";}function p(t,n){var e=arguments.length>2&&void 0!==arguments[2]&&arguments[2],r=!(arguments.length>3&&void 0!==arguments[3])||arguments[3],o=s(t.options),i=a(t.options).y;M(t,o,e),v(n,function(n){var e=0,o=parseInt(n.offsetHeight,10);isNaN(o)||(t.rows.forEach(function(n,r){n<t.rows[e]&&(e=r);}),n.style.position="absolute",n.style.top=t.rows[e]+"px",n.style.left=""+t.cols[e],t.rows[e]+=isNaN(o)?0:o+i,r&&(n.dataset.macyComplete=1));}),r&&(t.tmpRows=null),l(t);}function f(t,n){var e=arguments.length>2&&void 0!==arguments[2]&&arguments[2],r=!(arguments.length>3&&void 0!==arguments[3])||arguments[3],o=s(t.options),i=a(t.options).y;M(t,o,e),v(n,function(n){t.lastcol===o&&(t.lastcol=0);var e=C(n,"height");e=parseInt(n.offsetHeight,10),isNaN(e)||(n.style.position="absolute",n.style.top=t.rows[t.lastcol]+"px",n.style.left=""+t.cols[t.lastcol],t.rows[t.lastcol]+=isNaN(e)?0:e+i,t.lastcol+=1,r&&(n.dataset.macyComplete=1));}),r&&(t.tmpRows=null),l(t);}var h=function t(n,e){if(!(this instanceof t))return new t(n,e);if(n&&n.nodeName)return n;if(n=n.replace(/^\s*/,"").replace(/\s*$/,""),e)return this.byCss(n,e);for(var r in this.selectors)if(e=r.split("/"),new RegExp(e[1],e[2]).test(n))return this.selectors[r](n);return this.byCss(n)};h.prototype.byCss=function(t,n){return (n||document).querySelectorAll(t)},h.prototype.selectors={},h.prototype.selectors[/^\.[\w\-]+$/]=function(t){return document.getElementsByClassName(t.substring(1))},h.prototype.selectors[/^\w+$/]=function(t){return document.getElementsByTagName(t)},h.prototype.selectors[/^\#[\w\-]+$/]=function(t){return document.getElementById(t.substring(1))};var v=function(t,n){for(var e=t.length,r=e;e--;)n(t[r-e-1]);},m=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];this.running=!1,this.events=[],this.add(t);};m.prototype.run=function(){if(!this.running&&this.events.length>0){var t=this.events.shift();this.running=!0,t(),this.running=!1,this.run();}},m.prototype.add=function(){var t=this,n=arguments.length>0&&void 0!==arguments[0]&&arguments[0];return !!n&&(Array.isArray(n)?v(n,function(n){return t.add(n)}):(this.events.push(n),void this.run()))},m.prototype.clear=function(){this.events=[];};var d=function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return this.instance=t,this.data=n,this},y=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];this.events={},this.instance=t;};y.prototype.on=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0],n=arguments.length>1&&void 0!==arguments[1]&&arguments[1];return !(!t||!n)&&(Array.isArray(this.events[t])||(this.events[t]=[]),this.events[t].push(n))},y.prototype.emit=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0],n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(!t||!Array.isArray(this.events[t]))return !1;var e=new d(this.instance,n);v(this.events[t],function(t){return t(e)});};var g=function(t){return !("naturalHeight"in t&&t.naturalHeight+t.naturalWidth===0)||t.width+t.height!==0},E=function(t,n){var e=arguments.length>2&&void 0!==arguments[2]&&arguments[2];return new Promise(function(t,e){if(n.complete)return g(n)?t(n):e(n);n.addEventListener("load",function(){return g(n)?t(n):e(n)}),n.addEventListener("error",function(){return e(n)});}).then(function(n){e&&t.emit(t.constants.EVENT_IMAGE_LOAD,{img:n});}).catch(function(n){return t.emit(t.constants.EVENT_IMAGE_ERROR,{img:n})})},w=function(t,e){var r=arguments.length>2&&void 0!==arguments[2]&&arguments[2];return n(e,function(n){return E(t,n,r)})},A=function(t,n){var e=arguments.length>2&&void 0!==arguments[2]&&arguments[2];return Promise.all(w(t,n,e)).then(function(){t.emit(t.constants.EVENT_IMAGE_COMPLETE);})},I=function(n){return t(function(){n.emit(n.constants.EVENT_RESIZE),n.queue.add(function(){return n.recalculate(!0,!0)});},100)},N=function(t){if(t.container=h(t.options.container),t.container instanceof h||!t.container)return !!t.options.debug&&console.error("Error: Container not found");t.container.length&&(t.container=t.container[0]),t.options.container=t.container,t.container.style.position="relative";},T=function(t){t.queue=new m,t.events=new y(t),t.rows=[],t.resizer=I(t);},L=function(t){var n=h("img",t.container);window.addEventListener("resize",t.resizer),t.on(t.constants.EVENT_IMAGE_LOAD,function(){return t.recalculate(!1,!1)}),t.on(t.constants.EVENT_IMAGE_COMPLETE,function(){return t.recalculate(!0,!0)}),t.options.useOwnImageLoader||e(t,n,!t.options.waitForImages),t.emit(t.constants.EVENT_INITIALIZED);},_=function(t){N(t),T(t),L(t);},b=function(t){return t===Object(t)&&"[object Array]"!==Object.prototype.toString.call(t)},O=function(t,n){b(t)||(n.columns=t),b(t)&&t.columns&&(n.columns=t.columns),b(t)&&t.margin&&!b(t.margin)&&(n.margin={x:t.margin,y:t.margin}),b(t)&&t.margin&&b(t.margin)&&t.margin.x&&(n.margin.x=t.margin.x),b(t)&&t.margin&&b(t.margin)&&t.margin.y&&(n.margin.y=t.margin.y);},C=function(t,n){return window.getComputedStyle(t,null).getPropertyValue(n)},M=function(t,n){var e=arguments.length>2&&void 0!==arguments[2]&&arguments[2];if(t.lastcol||(t.lastcol=0),t.rows.length<1&&(e=!0),e){t.rows=[],t.cols=[],t.lastcol=0;for(var r=n-1;r>=0;r--)t.rows[r]=0,t.cols[r]=u(t,r);}else if(t.tmpRows){t.rows=[];for(var r=n-1;r>=0;r--)t.rows[r]=t.tmpRows[r];}else {t.tmpRows=[];for(var r=n-1;r>=0;r--)t.tmpRows[r]=t.rows[r];}},V=function(t){var n=arguments.length>1&&void 0!==arguments[1]&&arguments[1],e=!(arguments.length>2&&void 0!==arguments[2])||arguments[2],r=n?t.container.children:h(':scope > *:not([data-macy-complete="1"])',t.container);r=Array.from(r).filter(function(t){return null!==t.offsetParent});var o=c(t.options);return v(r,function(t){n&&(t.dataset.macyComplete=0),t.style.width=o;}),t.options.trueOrder?(f(t,r,n,e),t.emit(t.constants.EVENT_RECALCULATED)):(p(t,r,n,e),t.emit(t.constants.EVENT_RECALCULATED))},R=function(){return !!window.Promise},x=Object.assign||function(t){for(var n=1;n<arguments.length;n++){var e=arguments[n];for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);}return t};Array.from||(Array.from=function(t){for(var n=0,e=[];n<t.length;)e.push(t[n++]);return e});var k={columns:4,margin:2,trueOrder:!1,waitForImages:!1,useImageLoader:!0,breakAt:{},useOwnImageLoader:!1,onInit:!1,cancelLegacy:!1,useContainerForBreakpoints:!1};!function(){try{document.createElement("a").querySelector(":scope *");}catch(t){!function(){function t(t){return function(e){if(e&&n.test(e)){var r=this.getAttribute("id");r||(this.id="q"+Math.floor(9e6*Math.random())+1e6),arguments[0]=e.replace(n,"#"+this.id);var o=t.apply(this,arguments);return null===r?this.removeAttribute("id"):r||(this.id=r),o}return t.apply(this,arguments)}}var n=/:scope\b/gi,e=t(Element.prototype.querySelector);Element.prototype.querySelector=function(t){return e.apply(this,arguments)};var r=t(Element.prototype.querySelectorAll);Element.prototype.querySelectorAll=function(t){return r.apply(this,arguments)};}();}}();var q=function t(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:k;if(!(this instanceof t))return new t(n);this.options={},x(this.options,k,n),this.options.cancelLegacy&&!R()||_(this);};return q.init=function(t){return console.warn("Depreciated: Macy.init will be removed in v3.0.0 opt to use Macy directly like so Macy({ /*options here*/ }) "),new q(t)},q.prototype.recalculateOnImageLoad=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];return e(this,h("img",this.container),!t)},q.prototype.runOnImageLoad=function(t){var n=arguments.length>1&&void 0!==arguments[1]&&arguments[1],r=h("img",this.container);return this.on(this.constants.EVENT_IMAGE_COMPLETE,t),n&&this.on(this.constants.EVENT_IMAGE_LOAD,t),e(this,r,n)},q.prototype.recalculate=function(){var t=this,n=arguments.length>0&&void 0!==arguments[0]&&arguments[0],e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1];return e&&this.queue.clear(),this.queue.add(function(){return V(t,n,e)})},q.prototype.remove=function(){window.removeEventListener("resize",this.resizer),v(this.container.children,function(t){t.removeAttribute("data-macy-complete"),t.removeAttribute("style");}),this.container.removeAttribute("style");},q.prototype.reInit=function(){this.recalculate(!0,!0),this.emit(this.constants.EVENT_INITIALIZED),window.addEventListener("resize",this.resizer),this.container.style.position="relative";},q.prototype.on=function(t,n){this.events.on(t,n);},q.prototype.emit=function(t,n){this.events.emit(t,n);},q.constants={EVENT_INITIALIZED:"macy.initialized",EVENT_RECALCULATED:"macy.recalculated",EVENT_IMAGE_LOAD:"macy.image.load",EVENT_IMAGE_ERROR:"macy.image.error",EVENT_IMAGE_COMPLETE:"macy.images.complete",EVENT_RESIZE:"macy.resize"},q.prototype.constants=q.constants,q}); 
	} (macy, macy.exports));

	var macyExports = macy.exports;
	var Macy = /*@__PURE__*/getDefaultExportFromCjs(macyExports);

	var css_248z$6 = "@keyframes bp-fadein {\n  from {\n    opacity: 0.01;\n  }\n  to {\n    opacity: 1;\n  }\n}\n@keyframes bp-bar {\n  from {\n    transform: translateX(-100%);\n  }\n  to {\n    transform: translateX(0);\n  }\n}\n@keyframes bp-o {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}\n.bp-wrap {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  position: fixed;\n  z-index: 999;\n  /* If you're mounting on a portion of the screen and need visible\n  overflow on .bp-wrap, change contain to \"layout\" on that instance */\n  contain: strict;\n  touch-action: none;\n  -webkit-tap-highlight-color: transparent;\n}\n.bp-wrap > div:first-child {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: rgba(0, 0, 0, 0.75);\n  animation: bp-fadein 0.48s cubic-bezier(0.215, 0.61, 0.355, 1);\n}\n\n.bp-vid audio {\n  position: absolute;\n  left: 14px;\n  width: calc(100% - 28px);\n  bottom: 14px;\n  height: 50px;\n}\n\n.bp-inner {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  display: flex;\n}\n\n.bp-html {\n  display: contents;\n}\n.bp-html > :first-child {\n  margin: auto;\n}\n\n.bp-img-wrap {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  contain: strict;\n}\n.bp-img-wrap .bp-canzoom {\n  cursor: zoom-in;\n}\n.bp-img-wrap .bp-drag {\n  cursor: grabbing;\n}\n\n.bp-close {\n  contain: layout size;\n}\n\n.bp-img {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  user-select: none;\n  background-size: 100% 100%;\n}\n.bp-img img,\n.bp-img div {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n}\n.bp-img .bp-o {\n  display: none;\n}\n\n.bp-zoomed .bp-img:not(.bp-drag) {\n  cursor: grab;\n}\n.bp-zoomed .bp-cap {\n  opacity: 0;\n  animation: none !important;\n}\n\n.bp-zoomed.bp-small .bp-controls {\n  opacity: 0;\n}\n.bp-zoomed.bp-small .bp-controls button {\n  pointer-events: none;\n}\n\n.bp-controls {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  text-align: left;\n  transition: opacity 0.3s;\n  animation: bp-fadein 0.3s;\n}\n.bp-controls button {\n  pointer-events: auto;\n  cursor: pointer;\n  position: absolute;\n  border: 0;\n  background: rgba(0, 0, 0, 0.15);\n  opacity: 0.9;\n  transition: all 0.1s;\n  contain: content;\n}\n.bp-controls button:hover {\n  background-color: rgba(0, 0, 0, 0.2);\n  opacity: 1;\n}\n.bp-controls svg {\n  fill: #fff;\n}\n\n.bp-count {\n  position: absolute;\n  color: rgba(255, 255, 255, 0.9);\n  line-height: 1;\n  margin: 16px;\n  height: 50px;\n  width: 100px;\n}\n\n.bp-prev,\n.bp-next {\n  top: 50%;\n  right: 0;\n  margin-top: -32px;\n  height: 64px;\n  width: 58px;\n  border-radius: 3px 0 0 3px;\n}\n.bp-prev:hover:before,\n.bp-next:hover:before {\n  transform: translateX(-2px);\n}\n.bp-prev:before,\n.bp-next:before {\n  content: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z'/%3E%3C/svg%3E\");\n  position: absolute;\n  left: 7px;\n  top: 9px;\n  width: 46px;\n  transition: all 0.2s;\n}\n\n.bp-prev {\n  right: auto;\n  left: 0;\n  transform: scalex(-1);\n}\n\n.bp-x {\n  top: 0;\n  right: 0;\n  height: 55px;\n  width: 58px;\n  border-radius: 0 0 0 3px;\n}\n.bp-x:before {\n  content: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='%23fff'%3E%3Cpath d='M24 10l-2-2-6 6-6-6-2 2 6 6-6 6 2 2 6-6 6 6 2-2-6-6z'/%3E%3C/svg%3E\");\n  position: absolute;\n  width: 37px;\n  top: 8px;\n  right: 10px;\n}\n\n.bp-if,\n.bp-vid {\n  position: relative;\n  margin: auto;\n  background: #000;\n  background-size: 100% 100%;\n}\n.bp-if iframe,\n.bp-if video,\n.bp-if div,\n.bp-vid iframe,\n.bp-vid video,\n.bp-vid div {\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  border: 0;\n}\n\n.bp-load {\n  display: flex;\n  background-size: 100% 100%;\n  overflow: hidden;\n  z-index: 1;\n}\n\n.bp-bar {\n  position: absolute;\n  top: 0;\n  left: 0;\n  height: 3px;\n  width: 100%;\n  transform: translateX(-100%);\n  background: rgba(255, 255, 255, 0.9);\n  border-radius: 0 3px 3px 0;\n  animation: bp-bar 4s both;\n}\n\n.bp-o,\n.bp-o:after {\n  border-radius: 50%;\n  width: 90px;\n  height: 90px;\n}\n\n.bp-o {\n  margin: auto;\n  border: 10px solid rgba(255, 255, 255, 0.2);\n  border-left-color: rgba(255, 255, 255, 0.9);\n  animation: bp-o 1s infinite linear;\n}\n\n.bp-cap {\n  position: absolute;\n  bottom: 2%;\n  background: rgba(9, 9, 9, 0.8);\n  color: rgba(255, 255, 255, 0.9);\n  border-radius: 4px;\n  max-width: 95%;\n  line-height: 1.3;\n  padding: 0.6em 1.2em;\n  left: 50%;\n  transform: translateX(-50%);\n  width: fit-content;\n  width: -moz-fit-content;\n  display: table;\n  transition: opacity 0.3s;\n  animation: bp-fadein 0.2s;\n}\n.bp-cap a {\n  color: inherit;\n}\n\n.bp-inline {\n  position: absolute;\n}\n\n.bp-lock {\n  overflow-y: hidden;\n}\n.bp-lock body {\n  overflow: scroll;\n}\n\n.bp-noclose .bp-x {\n  display: none;\n}\n.bp-noclose:not(.bp-zoomed) {\n  touch-action: pan-y;\n}\n.bp-noclose:not(.bp-zoomed) .bp-img-wrap {\n  cursor: zoom-in;\n}\n\n@media (prefers-reduced-motion) {\n  .bp-wrap * {\n    animation-duration: 0s !important;\n  }\n}\n@media (max-width: 500px) {\n  .bp-x {\n    height: 47px;\n    width: 47px;\n  }\n  .bp-x:before {\n    width: 34px;\n    top: 6px;\n    right: 6px;\n  }\n\n  .bp-prev,\n.bp-next {\n    margin-top: -27px;\n    height: 54px;\n    width: 45px;\n  }\n  .bp-prev:before,\n.bp-next:before {\n    top: 7px;\n    left: 2px;\n    width: 43px;\n  }\n\n  .bp-o,\n.bp-o:after {\n    border-width: 6px;\n    width: 60px;\n    height: 60px;\n  }\n\n  .bp-count {\n    margin: 12px 10px;\n  }\n}\n";
	styleInject(css_248z$6);

	var css_248z$5 = ".svelte-1dmgfw2{box-sizing:border-box}";
	styleInject(css_248z$5);

	/* src/main/Home.svelte generated by Svelte v4.2.8 */

	const { console: console_1$5 } = globals;
	const file$5 = "src/main/Home.svelte";

	function create_fragment$5(ctx) {
		let div;
		let a0;
		let img0;
		let img0_src_value;
		let t0;
		let a1;
		let img1;
		let img1_src_value;
		let t1;
		let a2;
		let img2;
		let img2_src_value;
		let t2;
		let a3;
		let img3;
		let img3_src_value;
		let t3;
		let a4;
		let img4;
		let img4_src_value;
		let t4;
		let a5;
		let img5;
		let img5_src_value;
		let t5;
		let a6;
		let img6;
		let img6_src_value;
		let t6;
		let a7;
		let img7;
		let img7_src_value;
		let t7;
		let a8;
		let img8;
		let img8_src_value;

		const block = {
			c: function create() {
				div = element("div");
				a0 = element("a");
				img0 = element("img");
				t0 = space();
				a1 = element("a");
				img1 = element("img");
				t1 = space();
				a2 = element("a");
				img2 = element("img");
				t2 = space();
				a3 = element("a");
				img3 = element("img");
				t3 = space();
				a4 = element("a");
				img4 = element("img");
				t4 = space();
				a5 = element("a");
				img5 = element("img");
				t5 = space();
				a6 = element("a");
				img6 = element("img");
				t6 = space();
				a7 = element("a");
				img7 = element("img");
				t7 = space();
				a8 = element("a");
				img8 = element("img");
				if (!src_url_equal(img0.src, img0_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_pinkHydrangea_1-500_10.JPG")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "Picture of a pink hydrangea");
				attr_dev(img0, "class", "svelte-1dmgfw2");
				add_location(img0, file$5, 48, 1, 1085);
				attr_dev(a0, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/pinkHydrangea_1-500_10.JPG");
				attr_dev(a0, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/pinkHydrangea_1-500_10.JPG");
				attr_dev(a0, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_pinkHydrangea_1-500_10.JPG");
				attr_dev(a0, "data-height", "3456");
				attr_dev(a0, "data-width", "5184");
				attr_dev(a0, "data-alt", "Picture of a pink hydrangea");
				attr_dev(a0, "data-caption", "A pink hydrangea");
				attr_dev(a0, "class", "svelte-1dmgfw2");
				add_location(a0, file$5, 39, 0, 686);
				if (!src_url_equal(img1.src, img1_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_tinyFlowers_1-125_7.1.JPG")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "Picture of some tiny flowers");
				attr_dev(img1, "class", "svelte-1dmgfw2");
				add_location(img1, file$5, 62, 1, 1628);
				attr_dev(a1, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/tinyFlowers_1-125_7.1.JPG");
				attr_dev(a1, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/tinyFlowers_1-125_7.1.JPG");
				attr_dev(a1, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_tinyFlowers_1-125_7.1.JPG");
				attr_dev(a1, "data-height", "3456");
				attr_dev(a1, "data-width", "5184");
				attr_dev(a1, "data-alt", "Picture of some tiny flowers");
				attr_dev(a1, "data-caption", "Some tiny flowers");
				attr_dev(a1, "class", "svelte-1dmgfw2");
				add_location(a1, file$5, 53, 0, 1230);
				if (!src_url_equal(img2.src, img2_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_gooddog.JPG")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "Picture of a dawg");
				attr_dev(img2, "class", "svelte-1dmgfw2");
				add_location(img2, file$5, 76, 1, 2131);
				attr_dev(a2, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/gooddog.JPG");
				attr_dev(a2, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/gooddog.JPG");
				attr_dev(a2, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_gooddog.JPG");
				attr_dev(a2, "data-height", "3456");
				attr_dev(a2, "data-width", "5184");
				attr_dev(a2, "data-alt", "Picture of a dawg");
				attr_dev(a2, "data-caption", "A picture of a tibetan terrier");
				attr_dev(a2, "class", "svelte-1dmgfw2");
				add_location(a2, file$5, 67, 0, 1773);
				if (!src_url_equal(img3.src, img3_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_bees_1-80_5.6.JPG")) attr_dev(img3, "src", img3_src_value);
				attr_dev(img3, "alt", "Picture of buzzing bees");
				attr_dev(img3, "class", "svelte-1dmgfw2");
				add_location(img3, file$5, 90, 1, 2633);
				attr_dev(a3, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/bees_1-80_5.6.JPG");
				attr_dev(a3, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/bees_1-80_5.6.JPG");
				attr_dev(a3, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_bees_1-80_5.6.JPG");
				attr_dev(a3, "data-height", "3456");
				attr_dev(a3, "data-width", "5184");
				attr_dev(a3, "data-alt", "Picture of buzzing bees");
				attr_dev(a3, "data-caption", "A picture of bees and lavendar");
				attr_dev(a3, "class", "svelte-1dmgfw2");
				add_location(a3, file$5, 81, 0, 2251);
				if (!src_url_equal(img4.src, img4_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_arf.JPG")) attr_dev(img4, "src", img4_src_value);
				attr_dev(img4, "alt", "Picture of a dawg");
				attr_dev(img4, "class", "svelte-1dmgfw2");
				add_location(img4, file$5, 104, 1, 3117);
				attr_dev(a4, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/arf.JPG");
				attr_dev(a4, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/arf.JPG");
				attr_dev(a4, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_arf.JPG");
				attr_dev(a4, "data-height", "3456");
				attr_dev(a4, "data-width", "5184");
				attr_dev(a4, "data-alt", "Picture of a dawg");
				attr_dev(a4, "data-caption", "Another picture of a tibetan terrier");
				attr_dev(a4, "class", "svelte-1dmgfw2");
				add_location(a4, file$5, 95, 0, 2765);
				if (!src_url_equal(img5.src, img5_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_afterRain_1-640_10.JPG")) attr_dev(img5, "src", img5_src_value);
				attr_dev(img5, "alt", "Picture of a purple hydrangea after rain");
				attr_dev(img5, "class", "svelte-1dmgfw2");
				add_location(img5, file$5, 118, 1, 3677);
				attr_dev(a5, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/afterRain_1-640_10.JPG");
				attr_dev(a5, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/afterRain_1-640_10.JPG");
				attr_dev(a5, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_afterRain_1-640_10.JPG");
				attr_dev(a5, "data-height", "3456");
				attr_dev(a5, "data-width", "5184");
				attr_dev(a5, "data-alt", "Picture of a purple hydrangea after rain");
				attr_dev(a5, "data-caption", "A purple hydrangea after rain, with raindrops on the petals.");
				attr_dev(a5, "class", "svelte-1dmgfw2");
				add_location(a5, file$5, 109, 0, 3233);
				if (!src_url_equal(img6.src, img6_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_dawg_1-20_10.JPG")) attr_dev(img6, "src", img6_src_value);
				attr_dev(img6, "alt", "Picture of a dog");
				attr_dev(img6, "class", "svelte-1dmgfw2");
				add_location(img6, file$5, 132, 1, 4191);
				attr_dev(a6, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/dawg_1-20_10.JPG");
				attr_dev(a6, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/dawg_1-20_10.JPG");
				attr_dev(a6, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_dawg_1-20_10.JPG");
				attr_dev(a6, "data-height", "3456");
				attr_dev(a6, "data-width", "5184");
				attr_dev(a6, "data-alt", "Picture of a dog");
				attr_dev(a6, "data-caption", "A picture of a dog");
				attr_dev(a6, "class", "svelte-1dmgfw2");
				add_location(a6, file$5, 123, 0, 3831);
				if (!src_url_equal(img7.src, img7_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hydrangeaPair_1-640_10.JPG")) attr_dev(img7, "src", img7_src_value);
				attr_dev(img7, "alt", "A pair of hydrangeas");
				attr_dev(img7, "class", "svelte-1dmgfw2");
				add_location(img7, file$5, 146, 1, 4711);
				attr_dev(a7, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/hydrangeaPair_1-640_10.JPG");
				attr_dev(a7, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/hydrangeaPair_1-640_10.JPG");
				attr_dev(a7, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hydrangeaPair_1-640_10.JPG");
				attr_dev(a7, "data-height", "3456");
				attr_dev(a7, "data-width", "5184");
				attr_dev(a7, "data-alt", "A pair of hydrangeas");
				attr_dev(a7, "data-caption", "A pair of hydrangeas");
				attr_dev(a7, "class", "svelte-1dmgfw2");
				add_location(a7, file$5, 137, 0, 4315);
				if (!src_url_equal(img8.src, img8_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_notyetaflower_1-640_10.JPG")) attr_dev(img8, "src", img8_src_value);
				attr_dev(img8, "alt", "A picture of a hydrangea that hasn't bloomed yet.");
				attr_dev(img8, "class", "svelte-1dmgfw2");
				add_location(img8, file$5, 160, 1, 5303);
				attr_dev(a8, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/notyetaflower_1-640_10.JPG");
				attr_dev(a8, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/notyetaflower_1-640_10.JPG");
				attr_dev(a8, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_notyetaflower_1-640_10.JPG");
				attr_dev(a8, "data-height", "3456");
				attr_dev(a8, "data-width", "5184");
				attr_dev(a8, "data-alt", "A picture of a hydrangea that hasn't bloomed yet.");
				attr_dev(a8, "data-caption", "A picture of a hydrangea that hasn't bloomed yet.");
				attr_dev(a8, "class", "svelte-1dmgfw2");
				add_location(a8, file$5, 151, 0, 4849);
				attr_dev(div, "id", "images");
				attr_dev(div, "class", "svelte-1dmgfw2");
				add_location(div, file$5, 38, 0, 668);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, a0);
				append_dev(a0, img0);
				append_dev(div, t0);
				append_dev(div, a1);
				append_dev(a1, img1);
				append_dev(div, t1);
				append_dev(div, a2);
				append_dev(a2, img2);
				append_dev(div, t2);
				append_dev(div, a3);
				append_dev(a3, img3);
				append_dev(div, t3);
				append_dev(div, a4);
				append_dev(a4, img4);
				append_dev(div, t4);
				append_dev(div, a5);
				append_dev(a5, img5);
				append_dev(div, t5);
				append_dev(div, a6);
				append_dev(a6, img6);
				append_dev(div, t6);
				append_dev(div, a7);
				append_dev(a7, img7);
				append_dev(div, t7);
				append_dev(div, a8);
				append_dev(a8, img8);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$5.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Home', slots, []);
		let bp;

		onMount(() => {
			console.log('HOME');
			bp = BiggerPicture({ target: document.body });
			let imageLinks = document.querySelectorAll("#images > a");

			for (let link of imageLinks) {
				link.addEventListener("click", openGallery);
			}

			function openGallery(e) {
				e.preventDefault();
				bp.open({ items: imageLinks, el: e.currentTarget });
			}

			Macy({
				container: "#images",
				trueOrder: true,
				margin: 4,
				columns: 3,
				breakAt: { 520: { columns: 2 } }
			});
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<Home> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ onMount, BiggerPicture, Macy, bp });

		$$self.$inject_state = $$props => {
			if ('bp' in $$props) bp = $$props.bp;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [];
	}

	class Home extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Home",
				options,
				id: create_fragment$5.name
			});
		}
	}

	const state = writable([{id: 0, component: Home}]);

	var css_248z$4 = ".svelte-1dmgfw2{box-sizing:border-box}";
	styleInject(css_248z$4);

	/* src/main/FamilyFriends.svelte generated by Svelte v4.2.8 */

	const { console: console_1$4 } = globals;
	const file$4 = "src/main/FamilyFriends.svelte";

	function create_fragment$4(ctx) {
		let div;
		let a0;
		let img0;
		let img0_src_value;
		let t0;
		let a1;
		let img1;
		let img1_src_value;
		let t1;
		let a2;
		let img2;
		let img2_src_value;
		let t2;
		let a3;
		let img3;
		let img3_src_value;
		let t3;
		let a4;
		let img4;
		let img4_src_value;
		let t4;
		let a5;
		let img5;
		let img5_src_value;
		let t5;
		let a6;
		let img6;
		let img6_src_value;
		let t6;
		let a7;
		let img7;
		let img7_src_value;
		let t7;
		let a8;
		let img8;
		let img8_src_value;

		const block = {
			c: function create() {
				div = element("div");
				a0 = element("a");
				img0 = element("img");
				t0 = space();
				a1 = element("a");
				img1 = element("img");
				t1 = space();
				a2 = element("a");
				img2 = element("img");
				t2 = space();
				a3 = element("a");
				img3 = element("img");
				t3 = space();
				a4 = element("a");
				img4 = element("img");
				t4 = space();
				a5 = element("a");
				img5 = element("img");
				t5 = space();
				a6 = element("a");
				img6 = element("img");
				t6 = space();
				a7 = element("a");
				img7 = element("img");
				t7 = space();
				a8 = element("a");
				img8 = element("img");
				if (!src_url_equal(img0.src, img0_src_value = "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "Antelope Canyon");
				attr_dev(img0, "class", "svelte-1dmgfw2");
				add_location(img0, file$4, 48, 1, 1130);
				attr_dev(a0, "href", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg");
				attr_dev(a0, "data-img", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg 1667w");
				attr_dev(a0, "data-thumb", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg");
				attr_dev(a0, "data-height", "2500");
				attr_dev(a0, "data-width", "1667");
				attr_dev(a0, "data-alt", "Antelope Canyon");
				attr_dev(a0, "class", "svelte-1dmgfw2");
				add_location(a0, file$4, 40, 0, 699);
				if (!src_url_equal(img1.src, img1_src_value = "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "brown and white mountain under gray sky");
				attr_dev(img1, "class", "svelte-1dmgfw2");
				add_location(img1, file$4, 61, 1, 1714);
				attr_dev(a1, "href", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg");
				attr_dev(a1, "data-img", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg 2400w");
				attr_dev(a1, "data-thumb", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg");
				attr_dev(a1, "data-height", "2400");
				attr_dev(a1, "data-width", "2400");
				attr_dev(a1, "data-alt", "brown and white mountain under gray sky");
				attr_dev(a1, "class", "svelte-1dmgfw2");
				add_location(a1, file$4, 53, 0, 1255);
				if (!src_url_equal(img2.src, img2_src_value = "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "wildlife photography of brown bear cub");
				attr_dev(img2, "class", "svelte-1dmgfw2");
				add_location(img2, file$4, 74, 1, 2314);
				attr_dev(a2, "href", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg");
				attr_dev(a2, "data-img", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg 3000w");
				attr_dev(a2, "data-thumb", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg");
				attr_dev(a2, "data-height", "2000");
				attr_dev(a2, "data-width", "3000");
				attr_dev(a2, "data-alt", "wildlife photography of brown bear cub");
				attr_dev(a2, "class", "svelte-1dmgfw2");
				add_location(a2, file$4, 66, 0, 1864);
				if (!src_url_equal(img3.src, img3_src_value = "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg")) attr_dev(img3, "src", img3_src_value);
				attr_dev(img3, "alt", "green-and-brown palm trees under clear blue sky");
				attr_dev(img3, "class", "svelte-1dmgfw2");
				add_location(img3, file$4, 87, 1, 2924);
				attr_dev(a3, "href", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg");
				attr_dev(a3, "data-img", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg 3000w");
				attr_dev(a3, "data-thumb", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg");
				attr_dev(a3, "data-height", "2000");
				attr_dev(a3, "data-width", "3000");
				attr_dev(a3, "data-alt", "green-and-brown palm trees under clear blue sky");
				attr_dev(a3, "class", "svelte-1dmgfw2");
				add_location(a3, file$4, 79, 0, 2461);
				if (!src_url_equal(img4.src, img4_src_value = "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg")) attr_dev(img4, "src", img4_src_value);
				attr_dev(img4, "alt", "close up of a yellow and blue macaw");
				attr_dev(img4, "class", "svelte-1dmgfw2");
				add_location(img4, file$4, 100, 1, 3524);
				attr_dev(a4, "href", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg");
				attr_dev(a4, "data-img", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg 1667w");
				attr_dev(a4, "data-thumb", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg");
				attr_dev(a4, "data-height", "2500");
				attr_dev(a4, "data-width", "1667");
				attr_dev(a4, "data-alt", "close up of a yellow and blue macaw");
				attr_dev(a4, "class", "svelte-1dmgfw2");
				add_location(a4, file$4, 92, 0, 3081);
				if (!src_url_equal(img5.src, img5_src_value = "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg")) attr_dev(img5, "src", img5_src_value);
				attr_dev(img5, "alt", "mountains clouded in purple fog");
				attr_dev(img5, "class", "svelte-1dmgfw2");
				add_location(img5, file$4, 113, 1, 4058);
				attr_dev(a5, "href", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg");
				attr_dev(a5, "data-img", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_1500.jpg 1500w, https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg 2400w");
				attr_dev(a5, "data-thumb", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg");
				attr_dev(a5, "data-height", "2400");
				attr_dev(a5, "data-width", "2400");
				attr_dev(a5, "data-alt", "mountains clouded in purple fog");
				attr_dev(a5, "class", "svelte-1dmgfw2");
				add_location(a5, file$4, 105, 0, 3667);
				if (!src_url_equal(img6.src, img6_src_value = "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg")) attr_dev(img6, "src", img6_src_value);
				attr_dev(img6, "alt", "three brown leopards hiding on grass field during daytime");
				attr_dev(img6, "class", "svelte-1dmgfw2");
				add_location(img6, file$4, 126, 1, 4658);
				attr_dev(a6, "href", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg");
				attr_dev(a6, "data-img", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg 2400w");
				attr_dev(a6, "data-thumb", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg");
				attr_dev(a6, "data-height", "2400");
				attr_dev(a6, "data-width", "2400");
				attr_dev(a6, "data-alt", "three brown leopards hiding on grass field during daytime");
				attr_dev(a6, "class", "svelte-1dmgfw2");
				add_location(a6, file$4, 118, 0, 4185);
				if (!src_url_equal(img7.src, img7_src_value = "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg")) attr_dev(img7, "src", img7_src_value);
				attr_dev(img7, "alt", "people stand under unique trees on socotra");
				attr_dev(img7, "class", "svelte-1dmgfw2");
				add_location(img7, file$4, 139, 1, 5271);
				attr_dev(a7, "href", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg");
				attr_dev(a7, "data-img", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg 3000w");
				attr_dev(a7, "data-thumb", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg");
				attr_dev(a7, "data-height", "2000");
				attr_dev(a7, "data-width", "3000");
				attr_dev(a7, "data-alt", "people stand under unique trees on socotra");
				attr_dev(a7, "class", "svelte-1dmgfw2");
				add_location(a7, file$4, 131, 0, 4825);
				if (!src_url_equal(img8.src, img8_src_value = "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg")) attr_dev(img8, "src", img8_src_value);
				attr_dev(img8, "alt", "two brown deer beside trees and mountain");
				attr_dev(img8, "class", "svelte-1dmgfw2");
				add_location(img8, file$4, 152, 1, 5896);
				attr_dev(a8, "href", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg");
				attr_dev(a8, "data-img", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg 1667w");
				attr_dev(a8, "data-thumb", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg");
				attr_dev(a8, "data-height", "2500");
				attr_dev(a8, "data-width", "1667");
				attr_dev(a8, "data-alt", "two brown deer beside trees and mountain");
				attr_dev(a8, "class", "svelte-1dmgfw2");
				add_location(a8, file$4, 144, 0, 5420);
				attr_dev(div, "id", "images");
				attr_dev(div, "class", "svelte-1dmgfw2");
				add_location(div, file$4, 39, 0, 681);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, a0);
				append_dev(a0, img0);
				append_dev(div, t0);
				append_dev(div, a1);
				append_dev(a1, img1);
				append_dev(div, t1);
				append_dev(div, a2);
				append_dev(a2, img2);
				append_dev(div, t2);
				append_dev(div, a3);
				append_dev(a3, img3);
				append_dev(div, t3);
				append_dev(div, a4);
				append_dev(a4, img4);
				append_dev(div, t4);
				append_dev(div, a5);
				append_dev(a5, img5);
				append_dev(div, t5);
				append_dev(div, a6);
				append_dev(a6, img6);
				append_dev(div, t6);
				append_dev(div, a7);
				append_dev(a7, img7);
				append_dev(div, t7);
				append_dev(div, a8);
				append_dev(a8, img8);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$4($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('FamilyFriends', slots, []);
		let bp;

		onMount(() => {
			console.log('FAMILY & FRIENDS');
			bp = BiggerPicture({ target: document.body });
			let imageLinks = document.querySelectorAll("#images > a");

			for (let link of imageLinks) {
				link.addEventListener("click", openGallery);
			}

			function openGallery(e) {
				e.preventDefault();
				bp.open({ items: imageLinks, el: e.currentTarget });
			}

			Macy({
				container: "#images",
				trueOrder: true,
				margin: 4,
				columns: 3,
				breakAt: { 520: { columns: 2 } }
			});
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<FamilyFriends> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ onMount, BiggerPicture, Macy, bp });

		$$self.$inject_state = $$props => {
			if ('bp' in $$props) bp = $$props.bp;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [];
	}

	class FamilyFriends extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "FamilyFriends",
				options,
				id: create_fragment$4.name
			});
		}
	}

	var css_248z$3 = ".svelte-1dmgfw2{box-sizing:border-box}";
	styleInject(css_248z$3);

	/* src/main/Animals.svelte generated by Svelte v4.2.8 */

	const { console: console_1$3 } = globals;
	const file$3 = "src/main/Animals.svelte";

	function create_fragment$3(ctx) {
		let div;
		let a0;
		let img0;
		let img0_src_value;
		let t0;
		let a1;
		let img1;
		let img1_src_value;
		let t1;
		let a2;
		let img2;
		let img2_src_value;
		let t2;
		let a3;
		let img3;
		let img3_src_value;
		let t3;
		let a4;
		let img4;
		let img4_src_value;
		let t4;
		let a5;
		let img5;
		let img5_src_value;
		let t5;
		let a6;
		let img6;
		let img6_src_value;
		let t6;
		let a7;
		let img7;
		let img7_src_value;
		let t7;
		let a8;
		let img8;
		let img8_src_value;

		const block = {
			c: function create() {
				div = element("div");
				a0 = element("a");
				img0 = element("img");
				t0 = space();
				a1 = element("a");
				img1 = element("img");
				t1 = space();
				a2 = element("a");
				img2 = element("img");
				t2 = space();
				a3 = element("a");
				img3 = element("img");
				t3 = space();
				a4 = element("a");
				img4 = element("img");
				t4 = space();
				a5 = element("a");
				img5 = element("img");
				t5 = space();
				a6 = element("a");
				img6 = element("img");
				t6 = space();
				a7 = element("a");
				img7 = element("img");
				t7 = space();
				a8 = element("a");
				img8 = element("img");
				if (!src_url_equal(img0.src, img0_src_value = "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "Antelope Canyon");
				attr_dev(img0, "class", "svelte-1dmgfw2");
				add_location(img0, file$3, 48, 1, 1121);
				attr_dev(a0, "href", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg");
				attr_dev(a0, "data-img", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg 1667w");
				attr_dev(a0, "data-thumb", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg");
				attr_dev(a0, "data-height", "2500");
				attr_dev(a0, "data-width", "1667");
				attr_dev(a0, "data-alt", "Antelope Canyon");
				attr_dev(a0, "class", "svelte-1dmgfw2");
				add_location(a0, file$3, 40, 0, 690);
				if (!src_url_equal(img1.src, img1_src_value = "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "brown and white mountain under gray sky");
				attr_dev(img1, "class", "svelte-1dmgfw2");
				add_location(img1, file$3, 61, 1, 1705);
				attr_dev(a1, "href", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg");
				attr_dev(a1, "data-img", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg 2400w");
				attr_dev(a1, "data-thumb", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg");
				attr_dev(a1, "data-height", "2400");
				attr_dev(a1, "data-width", "2400");
				attr_dev(a1, "data-alt", "brown and white mountain under gray sky");
				attr_dev(a1, "class", "svelte-1dmgfw2");
				add_location(a1, file$3, 53, 0, 1246);
				if (!src_url_equal(img2.src, img2_src_value = "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "wildlife photography of brown bear cub");
				attr_dev(img2, "class", "svelte-1dmgfw2");
				add_location(img2, file$3, 74, 1, 2305);
				attr_dev(a2, "href", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg");
				attr_dev(a2, "data-img", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg 3000w");
				attr_dev(a2, "data-thumb", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg");
				attr_dev(a2, "data-height", "2000");
				attr_dev(a2, "data-width", "3000");
				attr_dev(a2, "data-alt", "wildlife photography of brown bear cub");
				attr_dev(a2, "class", "svelte-1dmgfw2");
				add_location(a2, file$3, 66, 0, 1855);
				if (!src_url_equal(img3.src, img3_src_value = "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg")) attr_dev(img3, "src", img3_src_value);
				attr_dev(img3, "alt", "green-and-brown palm trees under clear blue sky");
				attr_dev(img3, "class", "svelte-1dmgfw2");
				add_location(img3, file$3, 87, 1, 2915);
				attr_dev(a3, "href", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg");
				attr_dev(a3, "data-img", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg 3000w");
				attr_dev(a3, "data-thumb", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg");
				attr_dev(a3, "data-height", "2000");
				attr_dev(a3, "data-width", "3000");
				attr_dev(a3, "data-alt", "green-and-brown palm trees under clear blue sky");
				attr_dev(a3, "class", "svelte-1dmgfw2");
				add_location(a3, file$3, 79, 0, 2452);
				if (!src_url_equal(img4.src, img4_src_value = "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg")) attr_dev(img4, "src", img4_src_value);
				attr_dev(img4, "alt", "close up of a yellow and blue macaw");
				attr_dev(img4, "class", "svelte-1dmgfw2");
				add_location(img4, file$3, 100, 1, 3515);
				attr_dev(a4, "href", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg");
				attr_dev(a4, "data-img", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg 1667w");
				attr_dev(a4, "data-thumb", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg");
				attr_dev(a4, "data-height", "2500");
				attr_dev(a4, "data-width", "1667");
				attr_dev(a4, "data-alt", "close up of a yellow and blue macaw");
				attr_dev(a4, "class", "svelte-1dmgfw2");
				add_location(a4, file$3, 92, 0, 3072);
				if (!src_url_equal(img5.src, img5_src_value = "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg")) attr_dev(img5, "src", img5_src_value);
				attr_dev(img5, "alt", "mountains clouded in purple fog");
				attr_dev(img5, "class", "svelte-1dmgfw2");
				add_location(img5, file$3, 113, 1, 4049);
				attr_dev(a5, "href", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg");
				attr_dev(a5, "data-img", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_1500.jpg 1500w, https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg 2400w");
				attr_dev(a5, "data-thumb", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg");
				attr_dev(a5, "data-height", "2400");
				attr_dev(a5, "data-width", "2400");
				attr_dev(a5, "data-alt", "mountains clouded in purple fog");
				attr_dev(a5, "class", "svelte-1dmgfw2");
				add_location(a5, file$3, 105, 0, 3658);
				if (!src_url_equal(img6.src, img6_src_value = "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg")) attr_dev(img6, "src", img6_src_value);
				attr_dev(img6, "alt", "three brown leopards hiding on grass field during daytime");
				attr_dev(img6, "class", "svelte-1dmgfw2");
				add_location(img6, file$3, 126, 1, 4649);
				attr_dev(a6, "href", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg");
				attr_dev(a6, "data-img", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg 2400w");
				attr_dev(a6, "data-thumb", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg");
				attr_dev(a6, "data-height", "2400");
				attr_dev(a6, "data-width", "2400");
				attr_dev(a6, "data-alt", "three brown leopards hiding on grass field during daytime");
				attr_dev(a6, "class", "svelte-1dmgfw2");
				add_location(a6, file$3, 118, 0, 4176);
				if (!src_url_equal(img7.src, img7_src_value = "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg")) attr_dev(img7, "src", img7_src_value);
				attr_dev(img7, "alt", "people stand under unique trees on socotra");
				attr_dev(img7, "class", "svelte-1dmgfw2");
				add_location(img7, file$3, 139, 1, 5262);
				attr_dev(a7, "href", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg");
				attr_dev(a7, "data-img", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg 3000w");
				attr_dev(a7, "data-thumb", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg");
				attr_dev(a7, "data-height", "2000");
				attr_dev(a7, "data-width", "3000");
				attr_dev(a7, "data-alt", "people stand under unique trees on socotra");
				attr_dev(a7, "class", "svelte-1dmgfw2");
				add_location(a7, file$3, 131, 0, 4816);
				if (!src_url_equal(img8.src, img8_src_value = "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg")) attr_dev(img8, "src", img8_src_value);
				attr_dev(img8, "alt", "two brown deer beside trees and mountain");
				attr_dev(img8, "class", "svelte-1dmgfw2");
				add_location(img8, file$3, 152, 1, 5887);
				attr_dev(a8, "href", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg");
				attr_dev(a8, "data-img", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg 1667w");
				attr_dev(a8, "data-thumb", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg");
				attr_dev(a8, "data-height", "2500");
				attr_dev(a8, "data-width", "1667");
				attr_dev(a8, "data-alt", "two brown deer beside trees and mountain");
				attr_dev(a8, "class", "svelte-1dmgfw2");
				add_location(a8, file$3, 144, 0, 5411);
				attr_dev(div, "id", "images");
				attr_dev(div, "class", "svelte-1dmgfw2");
				add_location(div, file$3, 39, 0, 672);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, a0);
				append_dev(a0, img0);
				append_dev(div, t0);
				append_dev(div, a1);
				append_dev(a1, img1);
				append_dev(div, t1);
				append_dev(div, a2);
				append_dev(a2, img2);
				append_dev(div, t2);
				append_dev(div, a3);
				append_dev(a3, img3);
				append_dev(div, t3);
				append_dev(div, a4);
				append_dev(a4, img4);
				append_dev(div, t4);
				append_dev(div, a5);
				append_dev(a5, img5);
				append_dev(div, t5);
				append_dev(div, a6);
				append_dev(a6, img6);
				append_dev(div, t6);
				append_dev(div, a7);
				append_dev(a7, img7);
				append_dev(div, t7);
				append_dev(div, a8);
				append_dev(a8, img8);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Animals', slots, []);
		let bp;

		onMount(() => {
			console.log('ANIMALS');
			bp = BiggerPicture({ target: document.body });
			let imageLinks = document.querySelectorAll("#images > a");

			for (let link of imageLinks) {
				link.addEventListener("click", openGallery);
			}

			function openGallery(e) {
				e.preventDefault();
				bp.open({ items: imageLinks, el: e.currentTarget });
			}

			Macy({
				container: "#images",
				trueOrder: true,
				margin: 4,
				columns: 3,
				breakAt: { 520: { columns: 2 } }
			});
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Animals> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ onMount, BiggerPicture, Macy, bp });

		$$self.$inject_state = $$props => {
			if ('bp' in $$props) bp = $$props.bp;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [];
	}

	class Animals extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Animals",
				options,
				id: create_fragment$3.name
			});
		}
	}

	var css_248z$2 = ".svelte-1dmgfw2{box-sizing:border-box}";
	styleInject(css_248z$2);

	/* src/main/Plants.svelte generated by Svelte v4.2.8 */

	const { console: console_1$2 } = globals;
	const file$2 = "src/main/Plants.svelte";

	function create_fragment$2(ctx) {
		let div;
		let a0;
		let img0;
		let img0_src_value;
		let t0;
		let a1;
		let img1;
		let img1_src_value;
		let t1;
		let a2;
		let img2;
		let img2_src_value;
		let t2;
		let a3;
		let img3;
		let img3_src_value;
		let t3;
		let a4;
		let img4;
		let img4_src_value;
		let t4;
		let a5;
		let img5;
		let img5_src_value;
		let t5;
		let a6;
		let img6;
		let img6_src_value;
		let t6;
		let a7;
		let img7;
		let img7_src_value;
		let t7;
		let a8;
		let img8;
		let img8_src_value;

		const block = {
			c: function create() {
				div = element("div");
				a0 = element("a");
				img0 = element("img");
				t0 = space();
				a1 = element("a");
				img1 = element("img");
				t1 = space();
				a2 = element("a");
				img2 = element("img");
				t2 = space();
				a3 = element("a");
				img3 = element("img");
				t3 = space();
				a4 = element("a");
				img4 = element("img");
				t4 = space();
				a5 = element("a");
				img5 = element("img");
				t5 = space();
				a6 = element("a");
				img6 = element("img");
				t6 = space();
				a7 = element("a");
				img7 = element("img");
				t7 = space();
				a8 = element("a");
				img8 = element("img");
				if (!src_url_equal(img0.src, img0_src_value = "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "Antelope Canyon");
				attr_dev(img0, "class", "svelte-1dmgfw2");
				add_location(img0, file$2, 48, 1, 1120);
				attr_dev(a0, "href", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg");
				attr_dev(a0, "data-img", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg 1667w");
				attr_dev(a0, "data-thumb", "https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg");
				attr_dev(a0, "data-height", "2500");
				attr_dev(a0, "data-width", "1667");
				attr_dev(a0, "data-alt", "Antelope Canyon");
				attr_dev(a0, "class", "svelte-1dmgfw2");
				add_location(a0, file$2, 40, 0, 689);
				if (!src_url_equal(img1.src, img1_src_value = "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "brown and white mountain under gray sky");
				attr_dev(img1, "class", "svelte-1dmgfw2");
				add_location(img1, file$2, 61, 1, 1704);
				attr_dev(a1, "href", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg");
				attr_dev(a1, "data-img", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg 2400w");
				attr_dev(a1, "data-thumb", "https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg");
				attr_dev(a1, "data-height", "2400");
				attr_dev(a1, "data-width", "2400");
				attr_dev(a1, "data-alt", "brown and white mountain under gray sky");
				attr_dev(a1, "class", "svelte-1dmgfw2");
				add_location(a1, file$2, 53, 0, 1245);
				if (!src_url_equal(img2.src, img2_src_value = "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "wildlife photography of brown bear cub");
				attr_dev(img2, "class", "svelte-1dmgfw2");
				add_location(img2, file$2, 74, 1, 2304);
				attr_dev(a2, "href", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg");
				attr_dev(a2, "data-img", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg 3000w");
				attr_dev(a2, "data-thumb", "https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg");
				attr_dev(a2, "data-height", "2000");
				attr_dev(a2, "data-width", "3000");
				attr_dev(a2, "data-alt", "wildlife photography of brown bear cub");
				attr_dev(a2, "class", "svelte-1dmgfw2");
				add_location(a2, file$2, 66, 0, 1854);
				if (!src_url_equal(img3.src, img3_src_value = "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg")) attr_dev(img3, "src", img3_src_value);
				attr_dev(img3, "alt", "green-and-brown palm trees under clear blue sky");
				attr_dev(img3, "class", "svelte-1dmgfw2");
				add_location(img3, file$2, 87, 1, 2914);
				attr_dev(a3, "href", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg");
				attr_dev(a3, "data-img", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg 3000w");
				attr_dev(a3, "data-thumb", "https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg");
				attr_dev(a3, "data-height", "2000");
				attr_dev(a3, "data-width", "3000");
				attr_dev(a3, "data-alt", "green-and-brown palm trees under clear blue sky");
				attr_dev(a3, "class", "svelte-1dmgfw2");
				add_location(a3, file$2, 79, 0, 2451);
				if (!src_url_equal(img4.src, img4_src_value = "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg")) attr_dev(img4, "src", img4_src_value);
				attr_dev(img4, "alt", "close up of a yellow and blue macaw");
				attr_dev(img4, "class", "svelte-1dmgfw2");
				add_location(img4, file$2, 100, 1, 3514);
				attr_dev(a4, "href", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg");
				attr_dev(a4, "data-img", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg 1667w");
				attr_dev(a4, "data-thumb", "https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg");
				attr_dev(a4, "data-height", "2500");
				attr_dev(a4, "data-width", "1667");
				attr_dev(a4, "data-alt", "close up of a yellow and blue macaw");
				attr_dev(a4, "class", "svelte-1dmgfw2");
				add_location(a4, file$2, 92, 0, 3071);
				if (!src_url_equal(img5.src, img5_src_value = "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg")) attr_dev(img5, "src", img5_src_value);
				attr_dev(img5, "alt", "mountains clouded in purple fog");
				attr_dev(img5, "class", "svelte-1dmgfw2");
				add_location(img5, file$2, 113, 1, 4048);
				attr_dev(a5, "href", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg");
				attr_dev(a5, "data-img", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_1500.jpg 1500w, https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg 2400w");
				attr_dev(a5, "data-thumb", "https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg");
				attr_dev(a5, "data-height", "2400");
				attr_dev(a5, "data-width", "2400");
				attr_dev(a5, "data-alt", "mountains clouded in purple fog");
				attr_dev(a5, "class", "svelte-1dmgfw2");
				add_location(a5, file$2, 105, 0, 3657);
				if (!src_url_equal(img6.src, img6_src_value = "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg")) attr_dev(img6, "src", img6_src_value);
				attr_dev(img6, "alt", "three brown leopards hiding on grass field during daytime");
				attr_dev(img6, "class", "svelte-1dmgfw2");
				add_location(img6, file$2, 126, 1, 4648);
				attr_dev(a6, "href", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg");
				attr_dev(a6, "data-img", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg 2400w");
				attr_dev(a6, "data-thumb", "https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg");
				attr_dev(a6, "data-height", "2400");
				attr_dev(a6, "data-width", "2400");
				attr_dev(a6, "data-alt", "three brown leopards hiding on grass field during daytime");
				attr_dev(a6, "class", "svelte-1dmgfw2");
				add_location(a6, file$2, 118, 0, 4175);
				if (!src_url_equal(img7.src, img7_src_value = "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg")) attr_dev(img7, "src", img7_src_value);
				attr_dev(img7, "alt", "people stand under unique trees on socotra");
				attr_dev(img7, "class", "svelte-1dmgfw2");
				add_location(img7, file$2, 139, 1, 5261);
				attr_dev(a7, "href", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg");
				attr_dev(a7, "data-img", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg 3000w");
				attr_dev(a7, "data-thumb", "https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg");
				attr_dev(a7, "data-height", "2000");
				attr_dev(a7, "data-width", "3000");
				attr_dev(a7, "data-alt", "people stand under unique trees on socotra");
				attr_dev(a7, "class", "svelte-1dmgfw2");
				add_location(a7, file$2, 131, 0, 4815);
				if (!src_url_equal(img8.src, img8_src_value = "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg")) attr_dev(img8, "src", img8_src_value);
				attr_dev(img8, "alt", "two brown deer beside trees and mountain");
				attr_dev(img8, "class", "svelte-1dmgfw2");
				add_location(img8, file$2, 152, 1, 5886);
				attr_dev(a8, "href", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg");
				attr_dev(a8, "data-img", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg 1667w");
				attr_dev(a8, "data-thumb", "https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg");
				attr_dev(a8, "data-height", "2500");
				attr_dev(a8, "data-width", "1667");
				attr_dev(a8, "data-alt", "two brown deer beside trees and mountain");
				attr_dev(a8, "class", "svelte-1dmgfw2");
				add_location(a8, file$2, 144, 0, 5410);
				attr_dev(div, "id", "images");
				attr_dev(div, "class", "svelte-1dmgfw2");
				add_location(div, file$2, 39, 0, 671);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, a0);
				append_dev(a0, img0);
				append_dev(div, t0);
				append_dev(div, a1);
				append_dev(a1, img1);
				append_dev(div, t1);
				append_dev(div, a2);
				append_dev(a2, img2);
				append_dev(div, t2);
				append_dev(div, a3);
				append_dev(a3, img3);
				append_dev(div, t3);
				append_dev(div, a4);
				append_dev(a4, img4);
				append_dev(div, t4);
				append_dev(div, a5);
				append_dev(a5, img5);
				append_dev(div, t5);
				append_dev(div, a6);
				append_dev(a6, img6);
				append_dev(div, t6);
				append_dev(div, a7);
				append_dev(a7, img7);
				append_dev(div, t7);
				append_dev(div, a8);
				append_dev(a8, img8);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$2($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Plants', slots, []);
		let bp;

		onMount(() => {
			console.log('PLANTS');
			bp = BiggerPicture({ target: document.body });
			let imageLinks = document.querySelectorAll("#images > a");

			for (let link of imageLinks) {
				link.addEventListener("click", openGallery);
			}

			function openGallery(e) {
				e.preventDefault();
				bp.open({ items: imageLinks, el: e.currentTarget });
			}

			Macy({
				container: "#images",
				trueOrder: true,
				margin: 4,
				columns: 3,
				breakAt: { 520: { columns: 2 } }
			});
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Plants> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ onMount, BiggerPicture, Macy, bp });

		$$self.$inject_state = $$props => {
			if ('bp' in $$props) bp = $$props.bp;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [];
	}

	class Plants extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Plants",
				options,
				id: create_fragment$2.name
			});
		}
	}

	var css_248z$1 = ".svelte-1dmgfw2{box-sizing:border-box}";
	styleInject(css_248z$1);

	/* src/main/Other.svelte generated by Svelte v4.2.8 */

	const { console: console_1$1 } = globals;
	const file$1 = "src/main/Other.svelte";

	function create_fragment$1(ctx) {
		let div;
		let a0;
		let img0;
		let img0_src_value;
		let t0;
		let a1;
		let img1;
		let img1_src_value;
		let t1;
		let a2;
		let img2;
		let img2_src_value;
		let t2;
		let a3;
		let img3;
		let img3_src_value;
		let t3;
		let a4;
		let img4;
		let img4_src_value;
		let t4;
		let a5;
		let img5;
		let img5_src_value;
		let t5;
		let a6;
		let img6;
		let img6_src_value;
		let t6;
		let a7;
		let img7;
		let img7_src_value;
		let t7;
		let a8;
		let img8;
		let img8_src_value;

		const block = {
			c: function create() {
				div = element("div");
				a0 = element("a");
				img0 = element("img");
				t0 = space();
				a1 = element("a");
				img1 = element("img");
				t1 = space();
				a2 = element("a");
				img2 = element("img");
				t2 = space();
				a3 = element("a");
				img3 = element("img");
				t3 = space();
				a4 = element("a");
				img4 = element("img");
				t4 = space();
				a5 = element("a");
				img5 = element("img");
				t5 = space();
				a6 = element("a");
				img6 = element("img");
				t6 = space();
				a7 = element("a");
				img7 = element("img");
				t7 = space();
				a8 = element("a");
				img8 = element("img");
				if (!src_url_equal(img0.src, img0_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_smileyface.JPG")) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "Picture of a smiley face made from fireworks");
				attr_dev(img0, "class", "svelte-1dmgfw2");
				add_location(img0, file$1, 49, 2, 1108);
				attr_dev(a0, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/smileyface.JPG");
				attr_dev(a0, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/smileyface.JPG");
				attr_dev(a0, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_smileyface.JPG");
				attr_dev(a0, "data-height", "3456");
				attr_dev(a0, "data-width", "5184");
				attr_dev(a0, "data-alt", "Picture of a smiley face made from fireworks");
				attr_dev(a0, "data-caption", "This firework reminded me of a smiley face :).");
				attr_dev(a0, "class", "svelte-1dmgfw2");
				add_location(a0, file$1, 40, 1, 689);
				if (!src_url_equal(img1.src, img1_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_purpleexposure.JPG")) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "A firework that looks like a purple flower in the sky.");
				attr_dev(img1, "class", "svelte-1dmgfw2");
				add_location(img1, file$1, 63, 2, 1765);
				attr_dev(a1, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/purpleexposure.JPG");
				attr_dev(a1, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/purpleexposure.JPG");
				attr_dev(a1, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_purpleexposure.JPG");
				attr_dev(a1, "data-height", "1943");
				attr_dev(a1, "data-width", "2914");
				attr_dev(a1, "data-alt", "A firework that looks like a purple flower in the sky.");
				attr_dev(a1, "data-caption", "This firework looked like a purple flower in the sky to me, and the long shutter speed made it really neat.");
				attr_dev(a1, "class", "svelte-1dmgfw2");
				add_location(a1, file$1, 54, 1, 1263);
				if (!src_url_equal(img2.src, img2_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_firework.JPG")) attr_dev(img2, "src", img2_src_value);
				attr_dev(img2, "alt", "Picture of some tiny flowers");
				attr_dev(img2, "class", "svelte-1dmgfw2");
				add_location(img2, file$1, 77, 2, 2349);
				attr_dev(a2, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/firework.JPG");
				attr_dev(a2, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/firework.JPG");
				attr_dev(a2, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_firework.JPG");
				attr_dev(a2, "data-height", "5184");
				attr_dev(a2, "data-width", "3456");
				attr_dev(a2, "data-alt", "A nice singular photo of a firework");
				attr_dev(a2, "data-caption", "A pretty nice photo of a firework, if I do say so myself.");
				attr_dev(a2, "class", "svelte-1dmgfw2");
				add_location(a2, file$1, 68, 1, 1934);
				if (!src_url_equal(img3.src, img3_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_fireworks!.JPG")) attr_dev(img3, "src", img3_src_value);
				attr_dev(img3, "alt", "A picture of two fireworks");
				attr_dev(img3, "class", "svelte-1dmgfw2");
				add_location(img3, file$1, 91, 2, 2902);
				attr_dev(a3, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/fireworks!.JPG");
				attr_dev(a3, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/fireworks!.JPG");
				attr_dev(a3, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_fireworks!.JPG");
				attr_dev(a3, "data-height", "5184");
				attr_dev(a3, "data-width", "3456");
				attr_dev(a3, "data-alt", "A picture of two fireworks");
				attr_dev(a3, "data-caption", "The kickoff! These were the first two fireworks of the night.");
				attr_dev(a3, "class", "svelte-1dmgfw2");
				add_location(a3, file$1, 82, 1, 2486);
				if (!src_url_equal(img4.src, img4_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hacker.JPG")) attr_dev(img4, "src", img4_src_value);
				attr_dev(img4, "alt", "Picture of a firework that looks like that hacking scene from the matrix.");
				attr_dev(img4, "class", "svelte-1dmgfw2");
				add_location(img4, file$1, 105, 2, 3555);
				attr_dev(a4, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/hacker.JPG");
				attr_dev(a4, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/hacker.JPG");
				attr_dev(a4, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hacker.JPG");
				attr_dev(a4, "data-height", "3456");
				attr_dev(a4, "data-width", "3456");
				attr_dev(a4, "data-alt", "Picture of a firework that looks like that hacking scene from the matrix.");
				attr_dev(a4, "data-caption", "When I took this picture, I thought it looked a bit like the falling green text from the matrix due to the long shutter speed.");
				attr_dev(a4, "class", "svelte-1dmgfw2");
				add_location(a4, file$1, 96, 1, 3039);
				if (!src_url_equal(img5.src, img5_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_littlebitoeverything.JPG")) attr_dev(img5, "src", img5_src_value);
				attr_dev(img5, "alt", "Picture of a bunch of fireworks");
				attr_dev(img5, "class", "svelte-1dmgfw2");
				add_location(img5, file$1, 119, 2, 4247);
				attr_dev(a5, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/littlebitoeverything.JPG");
				attr_dev(a5, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/littlebitoeverything.JPG");
				attr_dev(a5, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_littlebitoeverything.JPG");
				attr_dev(a5, "data-height", "5184");
				attr_dev(a5, "data-width", "3456");
				attr_dev(a5, "data-alt", "Picture of a bunch of fireworks");
				attr_dev(a5, "data-caption", "Another picture of a bunch of fireworks, this one looked particularly interesting to me because of the long shutter speed.");
				attr_dev(a5, "class", "svelte-1dmgfw2");
				add_location(a5, file$1, 110, 1, 3735);
				if (!src_url_equal(img6.src, img6_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_monster.JPG")) attr_dev(img6, "src", img6_src_value);
				attr_dev(img6, "alt", "A picture of a bunch of fireworks that looks like a monster");
				attr_dev(img6, "class", "svelte-1dmgfw2");
				add_location(img6, file$1, 133, 2, 4937);
				attr_dev(a6, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/monster.JPG");
				attr_dev(a6, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/monster.JPG");
				attr_dev(a6, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_monster.JPG");
				attr_dev(a6, "data-height", "3456");
				attr_dev(a6, "data-width", "5184");
				attr_dev(a6, "data-alt", "A picture of a bunch of fireworks that looks like a monster");
				attr_dev(a6, "data-caption", "For some reason, this one reminded me of some sort of monster from a child's imagination, with the brightest orbs as eyes and the line of fireworks as a mouth.");
				attr_dev(a6, "class", "svelte-1dmgfw2");
				add_location(a6, file$1, 124, 1, 4399);
				if (!src_url_equal(img7.src, img7_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_planets.JPG")) attr_dev(img7, "src", img7_src_value);
				attr_dev(img7, "alt", "Picture of fireworks in an arrangement of planets");
				attr_dev(img7, "class", "svelte-1dmgfw2");
				add_location(img7, file$1, 147, 2, 5549);
				attr_dev(a7, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/planets.JPG");
				attr_dev(a7, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/planets.JPG");
				attr_dev(a7, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_planets.JPG");
				attr_dev(a7, "data-height", "3456");
				attr_dev(a7, "data-width", "3456");
				attr_dev(a7, "data-alt", "Picture of fireworks in an arrangement of planets");
				attr_dev(a7, "data-caption", "A bunch of circular fireworks that reminded me of planets in a solar system.");
				attr_dev(a7, "class", "svelte-1dmgfw2");
				add_location(a7, file$1, 138, 1, 5104);
				if (!src_url_equal(img8.src, img8_src_value = "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_skyflower.JPG")) attr_dev(img8, "src", img8_src_value);
				attr_dev(img8, "alt", "A firework that looks like a flower");
				attr_dev(img8, "class", "svelte-1dmgfw2");
				add_location(img8, file$1, 161, 2, 6108);
				attr_dev(a8, "href", "https://photographyhobby.s3.us-east-2.amazonaws.com/skyflower.JPG");
				attr_dev(a8, "data-img", "https://photographyhobby.s3.us-east-2.amazonaws.com/skyflower.JPG");
				attr_dev(a8, "data-thumb", "https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_skyflower.JPG");
				attr_dev(a8, "data-height", "3456");
				attr_dev(a8, "data-width", "5184");
				attr_dev(a8, "data-alt", "A firework that looks like a flower");
				attr_dev(a8, "data-caption", "This firework looked like a flower to me.");
				attr_dev(a8, "class", "svelte-1dmgfw2");
				add_location(a8, file$1, 152, 1, 5706);
				attr_dev(div, "id", "images");
				attr_dev(div, "class", "svelte-1dmgfw2");
				add_location(div, file$1, 39, 0, 670);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, a0);
				append_dev(a0, img0);
				append_dev(div, t0);
				append_dev(div, a1);
				append_dev(a1, img1);
				append_dev(div, t1);
				append_dev(div, a2);
				append_dev(a2, img2);
				append_dev(div, t2);
				append_dev(div, a3);
				append_dev(a3, img3);
				append_dev(div, t3);
				append_dev(div, a4);
				append_dev(a4, img4);
				append_dev(div, t4);
				append_dev(div, a5);
				append_dev(a5, img5);
				append_dev(div, t5);
				append_dev(div, a6);
				append_dev(a6, img6);
				append_dev(div, t6);
				append_dev(div, a7);
				append_dev(a7, img7);
				append_dev(div, t7);
				append_dev(div, a8);
				append_dev(a8, img8);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Other', slots, []);
		let bp;

		onMount(() => {
			console.log('OTHER');
			bp = BiggerPicture({ target: document.body });
			let imageLinks = document.querySelectorAll("#images > a");

			for (let link of imageLinks) {
				link.addEventListener("click", openGallery);
			}

			function openGallery(e) {
				e.preventDefault();
				bp.open({ items: imageLinks, el: e.currentTarget });
			}

			Macy({
				container: "#images",
				trueOrder: true,
				margin: 4,
				columns: 3,
				breakAt: { 520: { columns: 2 } }
			});
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Other> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ onMount, BiggerPicture, Macy, bp });

		$$self.$inject_state = $$props => {
			if ('bp' in $$props) bp = $$props.bp;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [];
	}

	class Other extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Other",
				options,
				id: create_fragment$1.name
			});
		}
	}

	var css_248z = ".modal.is-active.svelte-t55zjb.svelte-t55zjb{display:flex;align-items:center;justify-content:center}.field.has-addons.has-addons-centered.svelte-t55zjb.svelte-t55zjb{display:flex;justify-content:center;flex-wrap:wrap}.control.svelte-t55zjb.svelte-t55zjb{margin:5px}@media(max-width: 768px){.field.has-addons.has-addons-centered.svelte-t55zjb.svelte-t55zjb{flex-direction:column;align-items:center}.control.svelte-t55zjb.svelte-t55zjb{width:100%;text-align:center}.control.svelte-t55zjb button.svelte-t55zjb{width:100%}}";
	styleInject(css_248z);

	/* src/App.svelte generated by Svelte v4.2.8 */

	const { console: console_1 } = globals;
	const file = "src/App.svelte";

	// (150:27) 
	function create_if_block_5(ctx) {
		let other;
		let current;
		other = new Other({ $$inline: true });

		const block = {
			c: function create() {
				create_component(other.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(other, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(other.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(other.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(other, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5.name,
			type: "if",
			source: "(150:27) ",
			ctx
		});

		return block;
	}

	// (148:29) 
	function create_if_block_4(ctx) {
		let animals;
		let current;
		animals = new Animals({ $$inline: true });

		const block = {
			c: function create() {
				create_component(animals.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(animals, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(animals.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(animals.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(animals, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(148:29) ",
			ctx
		});

		return block;
	}

	// (146:28) 
	function create_if_block_3(ctx) {
		let plants;
		let current;
		plants = new Plants({ $$inline: true });

		const block = {
			c: function create() {
				create_component(plants.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(plants, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(plants.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(plants.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(plants, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(146:28) ",
			ctx
		});

		return block;
	}

	// (144:36) 
	function create_if_block_2(ctx) {
		let familyfriends;
		let current;
		familyfriends = new FamilyFriends({ $$inline: true });

		const block = {
			c: function create() {
				create_component(familyfriends.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(familyfriends, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(familyfriends.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(familyfriends.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(familyfriends, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(144:36) ",
			ctx
		});

		return block;
	}

	// (142:1) {#if page == "home"}
	function create_if_block_1(ctx) {
		let home;
		let current;
		home = new Home({ $$inline: true });

		const block = {
			c: function create() {
				create_component(home.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(home, target, anchor);
				current = true;
			},
			i: function intro(local) {
				if (current) return;
				transition_in(home.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(home.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(home, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(142:1) {#if page == \\\"home\\\"}",
			ctx
		});

		return block;
	}

	// (154:1) {#if attemptingAccess}
	function create_if_block(ctx) {
		let div3;
		let div0;
		let t0;
		let div2;
		let div1;
		let p;
		let t2;
		let input;
		let t3;
		let button0;
		let t5;
		let button1;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div3 = element("div");
				div0 = element("div");
				t0 = space();
				div2 = element("div");
				div1 = element("div");
				p = element("p");
				p.textContent = "Please enter the password to access the Family & Friends\n\t\t\t\t\t\tpage:";
				t2 = space();
				input = element("input");
				t3 = space();
				button0 = element("button");
				button0.textContent = "Submit";
				t5 = space();
				button1 = element("button");
				attr_dev(div0, "class", "modal-background");
				add_location(div0, file, 155, 3, 3750);
				add_location(p, file, 158, 5, 3845);
				attr_dev(input, "type", "password");
				attr_dev(input, "class", "input");
				add_location(input, file, 162, 5, 3939);
				attr_dev(button0, "class", "button is-primary mt-2");
				add_location(button0, file, 167, 5, 4036);
				attr_dev(div1, "class", "box");
				add_location(div1, file, 157, 4, 3822);
				attr_dev(div2, "class", "modal-content");
				add_location(div2, file, 156, 3, 3790);
				attr_dev(button1, "class", "modal-close is-large");
				attr_dev(button1, "aria-label", "close");
				add_location(button1, file, 173, 3, 4158);
				attr_dev(div3, "class", "modal is-active svelte-t55zjb");
				add_location(div3, file, 154, 2, 3717);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, div0);
				append_dev(div3, t0);
				append_dev(div3, div2);
				append_dev(div2, div1);
				append_dev(div1, p);
				append_dev(div1, t2);
				append_dev(div1, input);
				set_input_value(input, /*enteredPassword*/ ctx[2]);
				append_dev(div1, t3);
				append_dev(div1, button0);
				append_dev(div3, t5);
				append_dev(div3, button1);

				if (!mounted) {
					dispose = [
						listen_dev(input, "input", /*input_input_handler*/ ctx[13]),
						listen_dev(button0, "click", /*checkPassword*/ ctx[4], false, false, false, false),
						listen_dev(button1, "click", /*closeModal*/ ctx[5], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*enteredPassword*/ 4 && input.value !== /*enteredPassword*/ ctx[2]) {
					set_input_value(input, /*enteredPassword*/ ctx[2]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div3);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(154:1) {#if attemptingAccess}",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let body;
		let h1;
		let t1;
		let div0;
		let p0;
		let t2;
		let a0;
		let t4;
		let t5;
		let br0;
		let t6;
		let p1;
		let t7;
		let a1;
		let t9;
		let t10;
		let br1;
		let t11;
		let div6;
		let div1;
		let button0;
		let t12;
		let t13;
		let div2;
		let button1;
		let t14;
		let t15;
		let div3;
		let button2;
		let t16;
		let t17;
		let div4;
		let button3;
		let t18;
		let t19;
		let div5;
		let button4;
		let t20;
		let t21;
		let current_block_type_index;
		let if_block0;
		let t22;
		let t23;
		let br2;
		let t24;
		let div7;
		let p2;
		let current;
		let mounted;
		let dispose;

		const if_block_creators = [
			create_if_block_1,
			create_if_block_2,
			create_if_block_3,
			create_if_block_4,
			create_if_block_5
		];

		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*page*/ ctx[0] == "home") return 0;
			if (/*page*/ ctx[0] == "family-friends") return 1;
			if (/*page*/ ctx[0] == "plants") return 2;
			if (/*page*/ ctx[0] == "animals") return 3;
			if (/*page*/ ctx[0] == "other") return 4;
			return -1;
		}

		if (~(current_block_type_index = select_block_type(ctx))) {
			if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		}

		let if_block1 = /*attemptingAccess*/ ctx[1] && create_if_block(ctx);

		const block = {
			c: function create() {
				body = element("body");
				h1 = element("h1");
				h1.textContent = "Graham Zemel's Gallery";
				t1 = space();
				div0 = element("div");
				p0 = element("p");
				t2 = text("Welcome to my gallery! This is my personal photo gallery where I (");
				a0 = element("a");
				a0.textContent = "Graham Zemel";
				t4 = text(") upload my photos and share them with the world. I hope you enjoy\n\t\t\tthe photos as much as I enjoyed taking them.");
				t5 = space();
				br0 = element("br");
				t6 = space();
				p1 = element("p");
				t7 = text("You can find the source code for this project on\n\t\t\t");
				a1 = element("a");
				a1.textContent = "GitHub";
				t9 = text(".");
				t10 = space();
				br1 = element("br");
				t11 = space();
				div6 = element("div");
				div1 = element("div");
				button0 = element("button");
				t12 = text("Plants");
				t13 = space();
				div2 = element("div");
				button1 = element("button");
				t14 = text("Animals");
				t15 = space();
				div3 = element("div");
				button2 = element("button");
				t16 = text("Home");
				t17 = space();
				div4 = element("div");
				button3 = element("button");
				t18 = text("Family & Friends");
				t19 = space();
				div5 = element("div");
				button4 = element("button");
				t20 = text("Other");
				t21 = space();
				if (if_block0) if_block0.c();
				t22 = space();
				if (if_block1) if_block1.c();
				t23 = space();
				br2 = element("br");
				t24 = space();
				div7 = element("div");
				p2 = element("p");
				p2.textContent = "All images are taken by me, Graham Zemel. If you would like to use\n\t\t\tany, you are welcome to do so, but please credit me and link back to\n\t\t\tmy website.";
				attr_dev(h1, "class", "title has-text-centered");
				add_location(h1, file, 82, 1, 1980);
				attr_dev(a0, "href", "https://grahamzemel.com");
				add_location(a0, file, 85, 69, 2160);
				add_location(p0, file, 84, 2, 2087);
				add_location(br0, file, 90, 2, 2342);
				attr_dev(a1, "href", "https://github.com/grahamzemel/quantum-gallery");
				add_location(a1, file, 93, 3, 2410);
				add_location(p1, file, 91, 2, 2351);
				attr_dev(div0, "class", "box p-5 has-text-centered");
				add_location(div0, file, 83, 1, 2045);
				add_location(br1, file, 96, 1, 2495);
				attr_dev(button0, "class", "button same-width-button $" + /*isActive*/ ctx[6]('plants') + " svelte-t55zjb");
				add_location(button0, file, 100, 3, 2595);
				attr_dev(div1, "class", "control svelte-t55zjb");
				add_location(div1, file, 99, 2, 2570);
				attr_dev(button1, "class", "button same-width-button $" + /*isActive*/ ctx[6]('animals') + " svelte-t55zjb");
				add_location(button1, file, 108, 3, 2769);
				attr_dev(div2, "class", "control svelte-t55zjb");
				add_location(div2, file, 107, 2, 2744);
				attr_dev(button2, "class", "button same-width-button $" + /*isActive*/ ctx[6]('home') + " svelte-t55zjb");
				add_location(button2, file, 116, 3, 2946);
				attr_dev(div3, "class", "control svelte-t55zjb");
				add_location(div3, file, 115, 2, 2921);
				attr_dev(button3, "class", "button same-width-button $" + /*isActive*/ ctx[6]('family-friends') + " svelte-t55zjb");
				add_location(button3, file, 124, 3, 3114);
				attr_dev(div4, "class", "control svelte-t55zjb");
				add_location(div4, file, 123, 2, 3089);
				attr_dev(button4, "class", "button same-width-button $" + /*isActive*/ ctx[6]('other') + " svelte-t55zjb");
				add_location(button4, file, 132, 3, 3314);
				attr_dev(div5, "class", "control svelte-t55zjb");
				add_location(div5, file, 131, 2, 3289);
				attr_dev(div6, "class", "field has-addons has-addons-centered is-flex-wrap svelte-t55zjb");
				add_location(div6, file, 98, 1, 2504);
				add_location(br2, file, 181, 1, 4280);
				add_location(p2, file, 183, 2, 4330);
				attr_dev(div7, "class", "box p-5 has-text-centered");
				add_location(div7, file, 182, 1, 4288);
				attr_dev(body, "class", "container");
				add_location(body, file, 81, 0, 1954);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, body, anchor);
				append_dev(body, h1);
				append_dev(body, t1);
				append_dev(body, div0);
				append_dev(div0, p0);
				append_dev(p0, t2);
				append_dev(p0, a0);
				append_dev(p0, t4);
				append_dev(div0, t5);
				append_dev(div0, br0);
				append_dev(div0, t6);
				append_dev(div0, p1);
				append_dev(p1, t7);
				append_dev(p1, a1);
				append_dev(p1, t9);
				append_dev(body, t10);
				append_dev(body, br1);
				append_dev(body, t11);
				append_dev(body, div6);
				append_dev(div6, div1);
				append_dev(div1, button0);
				append_dev(button0, t12);
				append_dev(div6, t13);
				append_dev(div6, div2);
				append_dev(div2, button1);
				append_dev(button1, t14);
				append_dev(div6, t15);
				append_dev(div6, div3);
				append_dev(div3, button2);
				append_dev(button2, t16);
				append_dev(div6, t17);
				append_dev(div6, div4);
				append_dev(div4, button3);
				append_dev(button3, t18);
				append_dev(div6, t19);
				append_dev(div6, div5);
				append_dev(div5, button4);
				append_dev(button4, t20);
				append_dev(body, t21);

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].m(body, null);
				}

				append_dev(body, t22);
				if (if_block1) if_block1.m(body, null);
				append_dev(body, t23);
				append_dev(body, br2);
				append_dev(body, t24);
				append_dev(body, div7);
				append_dev(div7, p2);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*click_handler*/ ctx[8], false, false, false, false),
						listen_dev(button1, "click", /*click_handler_1*/ ctx[9], false, false, false, false),
						listen_dev(button2, "click", /*click_handler_2*/ ctx[10], false, false, false, false),
						listen_dev(button3, "click", /*click_handler_3*/ ctx[11], false, false, false, false),
						listen_dev(button4, "click", /*click_handler_4*/ ctx[12], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index !== previous_block_index) {
					if (if_block0) {
						group_outros();

						transition_out(if_blocks[previous_block_index], 1, 1, () => {
							if_blocks[previous_block_index] = null;
						});

						check_outros();
					}

					if (~current_block_type_index) {
						if_block0 = if_blocks[current_block_type_index];

						if (!if_block0) {
							if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
							if_block0.c();
						}

						transition_in(if_block0, 1);
						if_block0.m(body, t22);
					} else {
						if_block0 = null;
					}
				}

				if (/*attemptingAccess*/ ctx[1]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block(ctx);
						if_block1.c();
						if_block1.m(body, t23);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block0);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block0);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(body);
				}

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].d();
				}

				if (if_block1) if_block1.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let $state;
		validate_store(state, 'state');
		component_subscribe($$self, state, $$value => $$invalidate(7, $state = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let page;
		let testing = true;
		let attemptingAccess = false;
		let enteredPassword = "";
		let isPasswordProtected = true;
		const correctPassword = "2035859184";

		function navigateTo(page) {
			if (page === "family-friends" && isPasswordProtected) {
				$$invalidate(1, attemptingAccess = true);
				return;
			}

			if (page == "home") {
				state.set([{ id: 0, component: Home }]);
			} else if (page == "family-friends") {
				state.set([{ id: 1, component: FamilyFriends }]);
			} else if (page == "plants") {
				state.set([{ id: 2, component: Plants }]);
			} else if (page == "animals") {
				state.set([{ id: 3, component: Animals }]);
			} else if (page == "other") {
				state.set([{ id: 4, component: Other }]);
			}
		}

		function checkPassword() {
			if (enteredPassword === correctPassword) {
				isPasswordProtected = false;
				$$invalidate(1, attemptingAccess = false);
				navigateTo("family-friends");
			} else {
				alert("Incorrect password. Please try again.");
			}
		}

		function closeModal() {
			$$invalidate(1, attemptingAccess = false);
		}

		onMount(() => {
			state.set([{ id: 0, component: Home }]);
		});

		function isActive(buttonPage) {
			console.log(page, buttonPage);
			return page === buttonPage ? "is-active" : "";
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
		});

		const click_handler = () => navigateTo("plants");
		const click_handler_1 = () => navigateTo("animals");
		const click_handler_2 = () => navigateTo("home");
		const click_handler_3 = () => navigateTo("family-friends");
		const click_handler_4 = () => navigateTo("other");

		function input_input_handler() {
			enteredPassword = this.value;
			$$invalidate(2, enteredPassword);
		}

		$$self.$capture_state = () => ({
			state,
			onMount,
			Home,
			FamilyFriends,
			Animals,
			Plants,
			Other,
			page,
			testing,
			attemptingAccess,
			enteredPassword,
			isPasswordProtected,
			correctPassword,
			navigateTo,
			checkPassword,
			closeModal,
			isActive,
			$state
		});

		$$self.$inject_state = $$props => {
			if ('page' in $$props) $$invalidate(0, page = $$props.page);
			if ('testing' in $$props) $$invalidate(15, testing = $$props.testing);
			if ('attemptingAccess' in $$props) $$invalidate(1, attemptingAccess = $$props.attemptingAccess);
			if ('enteredPassword' in $$props) $$invalidate(2, enteredPassword = $$props.enteredPassword);
			if ('isPasswordProtected' in $$props) isPasswordProtected = $$props.isPasswordProtected;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*$state, page*/ 129) {
				if ($state) {
					$$invalidate(0, page = $state[0].component.name);

					if (!testing) {
						if (page == "se") {
							$$invalidate(0, page = "home");
						}

						if (page == "fe") {
							$$invalidate(0, page = "plants");
						}

						if (page == "pe") {
							$$invalidate(0, page = "animals");
						}

						if (page == "ke") {
							$$invalidate(0, page = "other");
						}

						if (page == "be") {
							$$invalidate(0, page = "family-friends");
						}
					} // i have no clue why this is happening only in production but this works
				}
			}
		};

		return [
			page,
			attemptingAccess,
			enteredPassword,
			navigateTo,
			checkPassword,
			closeModal,
			isActive,
			$state,
			click_handler,
			click_handler_1,
			click_handler_2,
			click_handler_3,
			click_handler_4,
			input_input_handler
		];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
		target: document.body,
		props: {
			name: 'world'
		}
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
