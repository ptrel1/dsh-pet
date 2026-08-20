/**
 * ============================================================================
 * dsh-pet 浏览器半侧（browser half）—— 超清透明动画渲染引擎
 * ============================================================================
 */

window.__ModuleLoader__.load({
	id: 'dsh-pet',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		const React = require('react');
		const { useEffect, useRef, useState, useCallback, createElement: e } = React;

		// ============================================================================
		// 内联样式注入（平滑抗锯齿插值 + GPU 硬件合成图层隔离）
		// ============================================================================
		const css = [
			'.dsh-pet-root{position:fixed;z-index:99999;pointer-events:none;user-select:none;right:12px;bottom:0;transform:translateZ(0)}',
			'.dsh-pet-stage{position:relative;width:var(--dsh-pet-size,462px);height:calc(var(--dsh-pet-size,462px)*9/16);pointer-events:none;transform:translateZ(0)}',
			'.dsh-pet-media{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;transform-origin:center;will-change:opacity,transform;transform:translateZ(0);backface-visibility:hidden;image-rendering:auto}',
			'.dsh-pet-hit{position:absolute;pointer-events:auto;cursor:grab;z-index:10}',
			'.dsh-pet-hit.dragging{cursor:grabbing}',
			'@media (prefers-reduced-motion: reduce){.dsh-pet-media{transition:none}}',
		].join('\n');
		const cssTag = 'dsh-pet/style.css';
		if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css="' + cssTag + '"]')) {
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-pet';
			tag.dataset.pluginCss = cssTag;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		const CANVAS_H = 360;
		const FEET_Y = 330;
		const HIT_BOX = { x0: 200, y0: 50, x1: 440, y1: 335 };
		const IDLE = '待机呼吸休闲';
		const TURN = '东张西望';
		const ACTS = [
			'悠闲哼歌', '超大伸懒腰', '原地专心玩魔方', '原地敲击桌面互动', '原地重力下蹲压缩',
			'哈欠连天', '原地小憩沉眠', '原地蹲下玩玩具汽车', '鲸鱼吐泡泡特效', '女仆屈膝礼仪',
			'被吓一跳（炸毛）', '原地跳跃抓碎头顶物品', '小幅度原地 360 度旋转展示', '偷吃零食被抓住',
			'玩游戏气急败坏', '用鲸鱼尾巴拍打地面', '打瞌睡被惊醒', '玩水枪', '小提琴演奏',
			'蓝鲸现世', '吃白饭', '照镜子', '优雅女仆舞', '轻快摇摆舞', '可爱宅舞',
			'整体换装试色', '大口吃零食', '吹气球', '动物环绕', '深度思考碎碎念',
			'轻快记录', '写代码', '吃Token', '吃早餐', '吃午餐', '吃晚餐',
			'放风筝', '摇扇纳凉', '吃冰淇淋融化', '被落叶淹没', '中秋赏月吃月饼', '堆雪人'
		];
		const CLICKS = ['点击回应 - 开心跃动', '点击回应 - 害羞惊讶', '点击回应 - 傲娇生气（侧身展示）'];
		const DRAG = '被鼠标拖拽悬空反馈';

		const pick = (pool, exclude) => {
			const entries = exclude ? pool.filter((n) => n !== exclude) : pool;
			return entries[Math.floor(Math.random() * entries.length)] || pool[0];
		};

		const getWebpUrl = (name) => '/pet/webp/' + encodeURIComponent(name) + '.webp';

		// ============================================================================
		// Pet 核心组件
		// ============================================================================
		function Pet({ config }) {
			const baseSize = (config && config.size) || 462;
			const [winWidth, setWinWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1000));
			const [winHeight, setWinHeight] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));

			const size = Math.min(baseSize, Math.max(140, Math.round(winWidth * 0.8)));
			const halfW = size / 2;
			const halfH = size * 9 / 16 / 2;
			const bottomPad = ((CANVAS_H - FEET_Y) / CANVAS_H) * (size * 9 / 16);

			const [activeSlot, setActiveSlot] = useState('A');
			const [srcA, setSrcA] = useState(() => getWebpUrl(IDLE));
			const [srcB, setSrcB] = useState('');
			const [facing, setFacing] = useState('left');
			const [dragging, setDragging] = useState(false);
			const [customPos, setCustomPos] = useState(null);

			const currentAnimRef = useRef(IDLE);
			const timerRef = useRef(null);
			const rootRef = useRef(null);
			const dragRef = useRef({ active: false, dragging: false, sx: 0, sy: 0, offX: 0, offY: 0 });

			const pickNext = useCallback(() => {
				const roll = Math.random();
				let nextAnim = IDLE;
				if (roll < 0.35) {
					nextAnim = IDLE;
				} else if (roll < 0.45) {
					nextAnim = TURN;
				} else {
					nextAnim = pick(ACTS, currentAnimRef.current);
				}
				playAnimation(nextAnim);
			}, []);

			const playAnimation = useCallback((name) => {
				currentAnimRef.current = name;
				const targetUrl = getWebpUrl(name);

				if (activeSlot === 'A') {
					setSrcB(targetUrl);
					setActiveSlot('B');
				} else {
					setSrcA(targetUrl);
					setActiveSlot('A');
				}

				if (name === TURN) {
					setTimeout(() => {
						setFacing((f) => (f === 'left' ? 'right' : 'left'));
					}, 2000);
				}

				if (timerRef.current) clearTimeout(timerRef.current);
				const duration = (name === IDLE ? 10000 : (name === TURN ? 4000 : (CLICKS.includes(name) ? 3500 : 10000)));
				timerRef.current = setTimeout(() => {
					if (!dragRef.current.active) {
						pickNext();
					}
				}, duration);
			}, [activeSlot, pickNext]);

			useEffect(() => {
				timerRef.current = setTimeout(pickNext, 10000);
				return () => {
					if (timerRef.current) clearTimeout(timerRef.current);
				};
			}, [pickNext]);

			useEffect(() => {
				const onResize = () => {
					setWinWidth(window.innerWidth);
					setWinHeight(window.innerHeight);
				};
				window.addEventListener('resize', onResize);
				return () => window.removeEventListener('resize', onResize);
			}, []);

			const handleClick = useCallback(() => {
				if (dragRef.current.active || dragRef.current.dragging) return;
				playAnimation(pick(CLICKS));
			}, [playAnimation]);

			const handlePointerDown = useCallback((e) => {
				e.currentTarget.classList.add('dragging');
				try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
				const rootEl = rootRef.current;
				let offX = 0, offY = 0;
				if (rootEl) {
					const rr = rootEl.getBoundingClientRect();
					offX = e.clientX - (rr.left + rr.width / 2);
					offY = e.clientY - (rr.top + rr.height / 2);
				}
				dragRef.current = { active: true, dragging: false, sx: e.clientX, sy: e.clientY, offX, offY };
			}, []);

			const handlePointerMove = useCallback((e) => {
				const d = dragRef.current;
				if (!d.active) return;
				const dx = e.clientX - d.sx;
				const dy = e.clientY - d.sy;
				if (!d.dragging) {
					if (Math.hypot(dx, dy) < 5) return;
					d.dragging = true;
					setDragging(true);
					playAnimation(DRAG);
				}
				const rootEl = rootRef.current;
				if (rootEl) {
					rootEl.style.left = (e.clientX - d.offX - halfW) + 'px';
					rootEl.style.top = (e.clientY - d.offY - halfH) + 'px';
					rootEl.style.right = 'auto';
					rootEl.style.bottom = 'auto';
				}
			}, [halfH, halfW, playAnimation]);

			const handlePointerUp = useCallback((e) => {
				const d = dragRef.current;
				const wasDragging = d.dragging;
				d.active = false;
				d.dragging = false;
				e.currentTarget.classList.remove('dragging');
				if (wasDragging) {
					setDragging(false);
					setCustomPos({
						rx: Math.max(0.05, Math.min(0.95, (e.clientX - d.offX) / winWidth)),
						ry: Math.max(0.05, Math.min(0.95, (e.clientY - d.offY) / winHeight)),
					});
					playAnimation(IDLE);
				}
			}, [playAnimation, winHeight, winWidth]);

			const rootStyle = customPos
				? {
					left: Math.min(Math.max(customPos.rx * winWidth - halfW, 0), winWidth - size) + 'px',
					top: Math.min(Math.max(customPos.ry * winHeight - halfH, 0), winHeight - size * 9 / 16) + 'px',
					right: 'auto',
					bottom: 'auto',
				}
				: {};

			const stageStyle = {
				transform: dragging ? 'none' : 'translateY(' + bottomPad + 'px)',
			};

			const transformStyle = {
				transform: facing === 'right' ? 'scaleX(-1)' : 'none',
			};

			const renderMedia = (slot, src) => {
				if (!src) return null;
				const isFront = activeSlot === slot;
				return e('img', {
					key: slot,
					className: 'dsh-pet-media',
					src: src,
					style: Object.assign({ opacity: isFront ? 1 : 0 }, transformStyle),
					alt: 'dsh-pet',
				});
			};

			return e('div', {
				ref: rootRef,
				className: 'dsh-pet-root',
				style: Object.assign({ '--dsh-pet-size': size + 'px' }, rootStyle),
			}, e('div', {
				className: 'dsh-pet-stage',
				style: stageStyle,
			},
				renderMedia('A', srcA),
				renderMedia('B', srcB),
				e('div', {
					className: 'dsh-pet-hit' + (dragging ? ' dragging' : ''),
					style: {
						left: (HIT_BOX.x0 / 640 * 100) + '%',
						top: (HIT_BOX.y0 / 360 * 100) + '%',
						width: ((HIT_BOX.x1 - HIT_BOX.x0) / 640 * 100) + '%',
						height: ((HIT_BOX.y1 - HIT_BOX.y0) / 360 * 100) + '%',
					},
					onClick: handleClick,
					onPointerDown: handlePointerDown,
					onPointerMove: handlePointerMove,
					onPointerUp: handlePointerUp,
					onPointerCancel: handlePointerUp,
					title: 'dsh-pet 桌面宠物 (点击互动/按住拖拽)',
				})
			));
		}

		const name = 'pet';
		const inject = ['slots'];

		function apply(ctx, config) {
			ctx.slots.inject('shell.overlay', function* () {
				yield ctx.slots.register({
					name: 'shell.overlay',
					id: 'pet',
					order: 1000,
				}, (ownerProps) => e(Pet, Object.assign({ config }, ownerProps)));
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
