(() => {
  'use strict';
  function isWebp() {
    const testWebP = (callback) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => callback(webP.height === 2);
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    };
    testWebP((support) => {
      const className = support ? 'webp' : 'no-webp';
      document.documentElement.classList.add(className);
    });
  }

  const getHash = () => location.hash ? location.hash.slice(1) : '';

  let bodyLocked = true;
  const unlockBody = (delay = 500) => {
    if (!bodyLocked) return;
    const lockElements = document.querySelectorAll('[data-lp]');
    setTimeout(() => {
      lockElements.forEach(el => el.style.paddingRight = '');
      document.body.style.paddingRight = '';
      document.documentElement.classList.remove('lock');
    }, delay);
    bodyLocked = false;
    setTimeout(() => { bodyLocked = true; }, delay);
  };

  const closeMenu = () => {
    unlockBody();
    document.documentElement.classList.remove('menu-open');
  };

  const log = (msg) => {
    setTimeout(() => {
      if (window.FLS) console.log(msg);
    }, 0);
  };

  const gotoBlock = (targetSelector, noHeader = false, speed = 500, offsetTop = 0) => {
    const target = document.querySelector(targetSelector);
    if (!target) {
      log(`[gotoBlock]: Block not found: ${targetSelector}`);
      return;
    }

    let headerHeight = 0;
    if (noHeader) {
      const header = document.querySelector('header.header');
      if (header && !header.classList.contains('_header-scroll')) {
        const origTransition = header.style.transitionDuration;
        header.style.transitionDuration = '0s';
        header.classList.add('_header-scroll');
        headerHeight = header.offsetHeight;
        header.classList.remove('_header-scroll');
        header.style.transitionDuration = origTransition;
      } else if (header) {
        headerHeight = header.offsetHeight;
      }
    }

    if (document.documentElement.classList.contains('menu-open')) closeMenu();

    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - offsetTop;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    log(`[gotoBlock]: Scrolling to ${targetSelector}`);
  };

  let addWindowScrollEvent = false;

  function initPageNavigation() {
    const handleClick = (e) => {
      const link = e.target.closest('[data-goto]');
      if (!link) return;

      const selector = link.dataset.goto;
      if (!selector) return;

      const noHeader = link.hasAttribute('data-goto-header');
      const speed = parseInt(link.dataset.gotoSpeed, 10) || 500;
      const offset = parseInt(link.dataset.gotoTop, 10) || 0;

      if (window.flsModules?.fullpage) {
        const section = document.querySelector(selector)?.closest('[data-fp-section]');
        const fpId = section ? parseInt(section.dataset.fpId, 10) : null;
        if (fpId !== null) {
          window.flsModules.fullpage.switchingSection(fpId);
          if (document.documentElement.classList.contains('menu-open')) closeMenu();
        }
      } else {
        gotoBlock(selector, noHeader, speed, offset);
      }
      e.preventDefault();
    };

    const handleWatcher = (e) => {
      if (e.type !== 'watcherCallback' || !e.detail) return;
      const entry = e.detail.entry;
      const target = entry.target;
      if (target.dataset.watch !== 'navigator') return;

      let navLink = null;
      if (target.id) navLink = document.querySelector(`[data-goto="#${target.id}"]`);
      else {
        for (const cls of target.classList) {
          navLink = document.querySelector(`[data-goto=".${cls}"]`);
          if (navLink) break;
        }
      }
      if (navLink) navLink.classList.toggle('_navigator-active', entry.isIntersecting);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('watcherCallback', handleWatcher);

    const hash = getHash();
    if (hash) {
      let targetSelector;
      if (document.getElementById(hash)) targetSelector = `#${hash}`;
      else if (document.querySelector(`.${hash}`)) targetSelector = `.${hash}`;
      if (targetSelector) gotoBlock(targetSelector, true, 500, 20);
    }
  }

  setTimeout(() => {
    if (addWindowScrollEvent) {
      const scrollEvent = new Event('windowScroll');
      window.addEventListener('scroll', () => document.dispatchEvent(scrollEvent));
    }
  }, 0);

  const initMarquee = () => {
    const marquees = document.querySelectorAll('[data-marquee]');
    if (!marquees.length) return;

    const CLASS = {
      wrapper: 'marquee-wrapper',
      inner: 'marquee-inner',
      item: 'marquee-item'
    };

    const debounce = (delay, fn) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    };

    const onResize = (cb) => {
      if (typeof cb !== 'function') return;
      let prevWidth = window.innerWidth;
      const handler = () => {
        const curWidth = window.innerWidth;
        if (prevWidth !== curWidth) {
          prevWidth = curWidth;
          cb();
        }
      };
      window.addEventListener('resize', debounce(50, handler));
      handler();
    };

    const buildStructure = (container) => {
      if (!container) return;
      const children = container.children;
      if (!children.length) return;
      container.classList.add(CLASS.wrapper);
      Array.from(children).forEach(child => child.classList.add(CLASS.item));
      container.innerHTML = `<div class="${CLASS.inner}">${container.innerHTML}</div>`;
    };

    const getSize = (el, isVertical) => isVertical ? el.offsetHeight : el.offsetWidth;

    marquees.forEach(wrapper => {
      if (!wrapper) return;
      buildStructure(wrapper);

      const inner = wrapper.firstElementChild;
      if (!inner) return;

      const dataSpace = parseFloat(wrapper.getAttribute('data-marquee-space')) || 0;
      const speed = (parseFloat(wrapper.getAttribute('data-marquee-speed')) || 1000) / 10;
      const pauseOnHover = wrapper.hasAttribute('data-marquee-pause-mouse-enter');
      const direction = wrapper.getAttribute('data-marquee-direction') || 'left';
      const isVertical = direction === 'top' || direction === 'bottom';
      const animId = `marqueeAnim-${Math.floor(Math.random() * 1e7)}`;

      let items = wrapper.querySelectorAll(`.${CLASS.item}`);
      let marginVal = parseFloat(getComputedStyle(items[0]).marginRight);
      let gap = marginVal ? marginVal : (isNaN(dataSpace) ? 30 : dataSpace);
      let startPos = parseFloat(wrapper.getAttribute('data-marquee-start')) || 0;

      let cache = [];
      let firstScreenSize = 0;
      let initialTotal = 0;

      const setBaseStyles = (size) => {
        let css = `display: flex; flex-wrap: nowrap;`;
        if (isVertical) {
          css += `flex-direction: column; position: relative; will-change: transform;`;
          if (direction === 'bottom') css += `top: -${size}px;`;
        } else {
          css += `position: relative; will-change: transform;`;
          if (direction === 'right') css += `left: -${size}px;`;
        }
        inner.style.cssText = css;
      };

      const getDirectionSign = (total) => (direction === 'right' || direction === 'bottom') ? total : -total;

      const createAnimation = (firstSize) => {
        const keyframes = `@keyframes ${animId} {
          0% { transform: translate${isVertical ? 'Y' : 'X'}(${startPos}%); }
          100% { transform: translate${isVertical ? 'Y' : 'X'}(${getDirectionSign(firstSize)}px); }
        }`;
        const style = document.createElement('style');
        style.classList.add(animId);
        style.textContent = keyframes;
        document.head.appendChild(style);
        inner.style.animation = `${animId} ${(firstSize + (startPos * firstSize) / 100) / speed}s infinite linear`;
      };

      const duplicateElements = () => {
        firstScreenSize = 0;
        let sum = 0;
        let childs = Array.from(inner.children);
        if (!childs.length) return;

        if (!cache.length) cache = childs.slice();
        else childs = cache.slice();

        inner.innerHTML = '';
        childs.forEach(el => inner.appendChild(el));

        childs.forEach(el => {
          if (isVertical) el.style.marginBottom = `${gap}px`;
          else {
            el.style.marginRight = `${gap}px`;
            el.style.flexShrink = 0;
          }
          const size = getSize(el, isVertical);
          sum += size + gap;
          firstScreenSize += size + gap;
          initialTotal += size + gap;
        });

        const viewSize = getSize(wrapper, isVertical);
        const needed = viewSize * 2 + initialTotal;
        let idx = 0;
        while (sum < needed) {
          const clone = childs[idx % childs.length].cloneNode(true);
          inner.appendChild(clone);
          sum += getSize(clone, isVertical) + gap;
          if (firstScreenSize < viewSize) firstScreenSize += getSize(clone, isVertical) + gap;
          idx++;
        }
        setBaseStyles(firstScreenSize);
      };

      const correctGap = () => {
        if (marginVal) {
          items.forEach(el => el.style.removeProperty('margin-right'));
          marginVal = parseFloat(getComputedStyle(items[0]).marginRight);
          gap = marginVal ? marginVal : (isNaN(dataSpace) ? 30 : dataSpace);
        }
      };

      const refresh = () => {
        document.head.querySelector(`.${animId}`)?.remove();
        correctGap();
        duplicateElements();
        createAnimation(firstScreenSize);
      };

      const onHoverPause = (e) => {
        inner.style.animationPlayState = e.type === 'mouseenter' ? 'paused' : 'running';
      };

      if (pauseOnHover) {
        inner.addEventListener('mouseenter', onHoverPause);
        inner.addEventListener('mouseleave', onHoverPause);
      }

      if (startPos) {
        inner.addEventListener('animationiteration', function onIter() {
          startPos = 0;
          inner.removeEventListener('animationiteration', onIter);
          refresh();
        });
      }

      refresh();
      onResize(refresh);
    });
  };

  class DynamicAdapt {
    constructor(type) {
      this.type = type;
      this.items = [];
      this.className = '_dynamic_adapt_';
    }

    init() {
      const nodes = [...document.querySelectorAll('[data-da]')];
      nodes.forEach(node => {
        const [targetSelector, rawBreakpoint, place] = node.dataset.da.split(',').map(s => s.trim());
        const breakpoint = rawBreakpoint || '767.98';
        const insertPlace = place || 'last';
        this.items.push({
          element: node,
          parent: node.parentNode,
          destination: document.querySelector(targetSelector),
          breakpoint,
          place: insertPlace,
          index: [...node.parentNode.children].indexOf(node)
        });
      });

      this.sortItems();
      this.mediaQueries = [...new Set(this.items.map(item => `(${this.type}-width: ${item.breakpoint / 16}em),${item.breakpoint}`))];

      this.mediaQueries.forEach(mq => {
        const [media, bp] = mq.split(',');
        const mql = window.matchMedia(media);
        const filtered = this.items.filter(i => i.breakpoint === bp);
        mql.addEventListener('change', () => this.handleMatch(mql, filtered));
        this.handleMatch(mql, filtered);
      });
    }

    handleMatch(mql, items) {
      if (mql.matches) {
        items.forEach(item => this.moveTo(item.place, item.element, item.destination));
      } else {
        items.forEach(item => this.moveBack(item.parent, item.element, item.index));
      }
    }

    moveTo(place, element, dest) {
      element.classList.add(this.className);
      if (place === 'last' || parseInt(place, 10) >= dest.children.length) {
        dest.appendChild(element);
      } else if (place === 'first') {
        dest.prepend(element);
      } else {
        dest.children[parseInt(place, 10)].before(element);
      }
    }

    moveBack(parent, element, originalIndex) {
      element.classList.remove(this.className);
      if (parent.children[originalIndex]) {
        parent.children[originalIndex].before(element);
      } else {
        parent.appendChild(element);
      }
    }

    sortItems() {
      const mult = this.type === 'min' ? 1 : -1;
      this.items.sort((a, b) => {
        if (a.breakpoint !== b.breakpoint) return (a.breakpoint - b.breakpoint) * mult;
        if (a.place === b.place) return 0;
        if (a.place === 'first') return -1 * mult;
        if (b.place === 'first') return 1 * mult;
        return 0;
      });
    }
  }

  const initStagesSlider = () => {
    const slides = document.querySelectorAll('.stages__item');
    if (!slides.length) return;

    const prevBtn = document.querySelector('.stages__nav--prev');
    const nextBtn = document.querySelector('.stages__nav--next');
    const pagination = document.querySelector('.stages__pagination');

    const PER_PAGE = 1;
    const ANIM_MS = 400;
    const MOBILE_BP = 768;
    const DESKTOP_BP = 991;

    let currentIndex = 0;
    let animating = false;
    let dots = [];

    function buildPagination() {
      if (!pagination) return;
      const totalPages = Math.ceil(slides.length / PER_PAGE);
      pagination.innerHTML = '';
      dots = [];
      for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('span');
        dot.className = 'stages__dot';
        dot.setAttribute('aria-label', `Слайд ${i + 1}`);
        dot.addEventListener('click', () => {
          if (animating) return;
          const target = i * PER_PAGE;
          goTo(target, target > currentIndex ? 'next' : 'prev');
        });
        pagination.appendChild(dot);
        dots.push(dot);
      }
      updateDots();
    }

    function updateDots() {
      const page = Math.floor(currentIndex / PER_PAGE);
      dots.forEach((dot, idx) => dot.classList.toggle('is-active', idx === page));
    }

    function updateNavButtons() {
      const max = slides.length - PER_PAGE;
      if (prevBtn) prevBtn.classList.toggle('is-disabled', currentIndex <= 0);
      if (nextBtn) nextBtn.classList.toggle('is-disabled', currentIndex >= max);
    }

    function setActiveSlide(idx) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === idx);
        slide.classList.remove('is-prev', 'is-next');
        slide.style.zIndex = i === idx ? '2' : '';
      });
    }

    function applyTransition(nextIdx, direction) {
      if (animating) return;
      animating = true;

      const oldSlide = slides[currentIndex];
      const newSlide = slides[nextIdx];
      if (!oldSlide || !newSlide) {
        animating = false;
        return;
      }

      slides.forEach(s => s.style.zIndex = '');
      oldSlide.classList.remove('is-active', 'is-prev', 'is-next');
      oldSlide.classList.add(direction === 'next' ? 'is-prev' : 'is-next');
      oldSlide.style.zIndex = '1';

      newSlide.classList.remove('is-active', 'is-prev', 'is-next');
      newSlide.classList.add(direction === 'next' ? 'is-next' : 'is-prev');
      newSlide.style.zIndex = '2';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          newSlide.classList.remove('is-prev', 'is-next');
          newSlide.classList.add('is-active');
        });
      });

      setTimeout(() => {
        setActiveSlide(nextIdx);
        animating = false;
      }, ANIM_MS + 40);
    }

    function goTo(target, direction = 'next') {
      const max = slides.length - PER_PAGE;
      const nextIndex = Math.min(max, Math.max(0, target));
      if (nextIndex === currentIndex || animating) return;

      if (window.innerWidth <= MOBILE_BP) {
        applyTransition(nextIndex, direction);
      } else {
        setActiveSlide(nextIndex);
      }

      currentIndex = nextIndex;
      updateNavButtons();
      updateDots();
      updateCardsActiveClass();
    }

    function saveOriginalHtml() {
      document.querySelectorAll('.stages__text').forEach(el => {
        if (!el.dataset.originalHtml) el.dataset.originalHtml = el.innerHTML;
      });
    }

    function removeLineBreaks() {
      document.querySelectorAll('.stages__text').forEach(el => {
        el.querySelectorAll('br').forEach(br => br.remove());
      });
    }

    function restoreLineBreaks() {
      document.querySelectorAll('.stages__text').forEach(el => {
        if (el.dataset.originalHtml) el.innerHTML = el.dataset.originalHtml;
      });
    }

    function updateCardsActiveClass() {
      const active = document.querySelectorAll('.stages__item.is-active');
      active.forEach(item => {
        const cards = item.querySelectorAll('.stages__card');
        cards.forEach((card, idx) => {
          card.classList.toggle('is-active', idx !== cards.length - 1);
          card.classList.toggle('is-active-last', idx === cards.length - 1);
        });
      });
    }

    function layout() {
      if (window.innerWidth > DESKTOP_BP) restoreLineBreaks();
      else removeLineBreaks();

      if (window.innerWidth > MOBILE_BP) {
        slides.forEach(s => s.classList.add('is-active'));
        setActiveSlide(currentIndex);
      } else {
        slides.forEach(s => s.classList.remove('is-active', 'is-prev', 'is-next'));
        const activeSlide = slides[currentIndex] || slides[0];
        if (activeSlide) {
          activeSlide.classList.add('is-active');
          activeSlide.style.zIndex = '2';
        }
      }
      updateNavButtons();
      updateDots();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => !animating && goTo(currentIndex - PER_PAGE, 'prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => !animating && goTo(currentIndex + PER_PAGE, 'next'));

    window.addEventListener('resize', layout);
    document.addEventListener('DOMContentLoaded', () => {
      saveOriginalHtml();
      buildPagination();
      layout();
      updateCardsActiveClass();
    });
  };

  const initParticipantsCarousel = () => {
    const root = document.querySelector('.participants');
    if (!root) return;

    const viewport = root.querySelector('.participants__viewport');
    const track = root.querySelector('.participants__track');
    const slides = root.querySelectorAll('.participants__slide');
    if (!viewport || !track || !slides.length) return;

    const prevBtns = root.querySelectorAll('.participants__arrow--prev');
    const nextBtns = root.querySelectorAll('.participants__arrow--next');
    const currentSpans = root.querySelectorAll('.participants__current');
    const totalSpans = root.querySelectorAll('.participants__total');

    const TOTAL = slides.length;
    totalSpans.forEach(span => span.textContent = TOTAL);
    currentSpans.forEach(span => span.textContent = '1');

    let slidesPerView = 1;
    let slideWidth = 0;
    let currentIdx = 0;
    let autoInterval = null;

    const getGap = () => {
      const cs = getComputedStyle(track);
      return parseFloat(cs.columnGap || cs.gap || '0') || 0;
    };

    const calcSlidesPerView = () => {
      const w = viewport.clientWidth;
      slidesPerView = w >= 1200 ? 3 : w >= 768 ? 2 : 1;
    };

    const maxIndex = () => Math.max(0, TOTAL - slidesPerView);
    const clamp = () => { currentIdx = Math.min(maxIndex(), Math.max(0, currentIdx)); };

    const move = () => {
      const translate = -currentIdx * (slideWidth + getGap());
      track.style.transform = `translateX(${translate}px)`;
      currentSpans.forEach(span => span.textContent = currentIdx + 1);
      viewport.setAttribute('aria-live', 'polite');
    };

    const updateButtons = () => {
      const max = maxIndex();
      prevBtns.forEach(btn => btn.disabled = currentIdx === 0);
      nextBtns.forEach(btn => btn.disabled = currentIdx === max);
    };

    const layout = () => {
      calcSlidesPerView();
      const w = viewport.clientWidth;
      const gap = getGap();
      const newWidth = (w - gap * (slidesPerView - 1)) / slidesPerView;
      if (Math.abs(newWidth - slideWidth) < 0.5) {
        clamp();
        move();
        updateButtons();
        return;
      }
      slideWidth = newWidth;
      slides.forEach(slide => slide.style.width = `${slideWidth}px`);
      clamp();
      move();
      updateButtons();
    };

    const next = () => {
      if (currentIdx < maxIndex()) {
        currentIdx++;
        move();
        updateButtons();
      } else {
        stopAuto();
      }
    };
    const prev = () => {
      if (currentIdx > 0) {
        currentIdx--;
        move();
        updateButtons();
      }
    };

    nextBtns.forEach(btn => btn.addEventListener('click', next));
    prevBtns.forEach(btn => btn.addEventListener('click', prev));

    viewport.setAttribute('tabindex', '0');
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    });

    let pointerStartX = null, pointerDelta = 0, pointerId = null;
    viewport.addEventListener('pointerdown', (e) => {
      pointerStartX = e.clientX;
      pointerDelta = 0;
      pointerId = e.pointerId;
      viewport.setPointerCapture(pointerId);
    });
    viewport.addEventListener('pointermove', (e) => {
      if (pointerStartX === null) return;
      pointerDelta = e.clientX - pointerStartX;
    });
    viewport.addEventListener('pointerup', () => {
      if (pointerStartX === null) return;
      if (Math.abs(pointerDelta) > slideWidth * 0.25) {
        pointerDelta < 0 ? next() : prev();
      }
      pointerStartX = null;
      pointerDelta = 0;
      pointerId = null;
    });

    let resizeFrame = 0;
    const scheduleLayout = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(layout);
    };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => scheduleLayout());
      ro.observe(viewport);
    } else {
      window.addEventListener('resize', scheduleLayout);
    }
    window.addEventListener('orientationchange', scheduleLayout);

    const stopAuto = () => {
      if (autoInterval) clearInterval(autoInterval);
      autoInterval = null;
    };
    const startAuto = () => {
      stopAuto();
      autoInterval = setInterval(() => {
        if (currentIdx < maxIndex()) next();
        else stopAuto();
      }, 4000);
    };

    [...prevBtns, ...nextBtns].forEach(btn => btn.addEventListener('click', stopAuto));
    viewport.addEventListener('pointerdown', stopAuto);
    viewport.addEventListener('keydown', stopAuto);

    layout();
    startAuto();
  };

  window.FLS = false;

  isWebp();
  initPageNavigation();
  initMarquee();

  const dynamicAdapt = new DynamicAdapt('max');
  dynamicAdapt.init();

  initStagesSlider();
  initParticipantsCarousel();
})();