export function setCarousel() {
  'use strict';

  const FOCUSABLE = 'a, area, input, button, select, option, textarea, output, summary, video, audio, object, embed, iframe';
  const TRANSITIONEND = 'transitionend';

  initCarousel('.js-carousel', {
    autoPlay: true,
    // animationType: 'fade',
  });

  function initCarousel (rootEl, options) {
    const rootElement = document.querySelectorAll(rootEl);
    let o = {
      wrap: 'carousel__wrap',
      slideWrap: 'carousel__slide-wrap',
      slideInner: 'carousel__slide-inner',
      item: 'carousel__item',
      nextClass: 'carousel__next',
      prevClass: 'carousel__prev',
      playerWrapClass: 'carousel__player-wrap',
      indicatorWrapClass: 'carousel__indicator-wrap',
      indicatorClass: 'carousel__indicator',
      playClass: 'carousel__play',
      pauseClass: 'carousel__pause',
      autoPlayHookClass: 'carousel__play-hook',
      animationType: 'slide',
      easing: 'ease',
      autoPlay: false,
      onStopPlay: false,
      swipe: true,
      dots: true,
      spColumn: null,
      colMargin: null,
      column: 1,
      breakPoint: 767,
      playInterval: 5000,
      resizeThreshold: 200,
      duration: 500
    };

    if (options) {
      for (let key in options) {
        o[key] = options[key];
      }
    }

    return rootElement.forEach(function (el) {
      const root = el;

      /**
       * カルーセルコンストラクタ
       * @constructor
       */
      const Carousel = function () {
        // DOMオブジェクト
        this.root = root;
        this.slideWrap = root.querySelector('.' + o.slideWrap);
        this.slideInner = root.querySelector('.' + o.slideInner);
        this.wrap = root.querySelector('.' + o.wrap);
        this.item = root.querySelectorAll('.' + o.item);
        this.itemLength = this.item.length;
        this.itemFocus = this.item.forEach(function (el) {
          el.querySelectorAll(FOCUSABLE);
        });

        // DOMの生成
        this.nextButton = document.createElement('button');
        this.prevButton = document.createElement('button');
        this.playerWrap = document.createElement('div');
        this.indicatorWrap = document.createElement('ul');
        this.playButton = document.createElement('button');
        this.pauseButton = document.createElement('button');

        // class名
        this.nextClass = o.nextClass;
        this.prevClass = o.prevClass;
        this.playClass = o.playClass;
        this.pauseClass = o.pauseClass;
        this.autoPlayHookClass = o.autoPlayHookClass;
        this.indicatorWrapClass = o.indicatorWrapClass;
        this.playerWrapClass = o.playerWrapClass;
        this.itemClass = o.item;
        this.indicatorClass = o.indicatorClass;

        // オプションの設定
        this.dots = o.dots;
        this.column = o.column;
        this.colMargin = o.colMargin;
        this.defalutMargin = o.colMargin;
        this.defalutColumn = o.column;
        this.spColumn = o.spColumn;
        this.playInterval = o.playInterval;
        this.autoPlay = o.autoPlay;
        this.onStopPlay = o.onStopPlay;
        this.eaing = o.eaing;
        this.swipe = o.swipe;
        this.breakPoint = o.breakPoint;
        this.animationType = o.animationType;
        this.resizeThreshold = o.resizeThreshold;
        this.duration = o.duration;

        // 動的に代入されるの設定
        this.indicator = null;
        this.cloneBeforeWrap = null;
        this.cloneAfterWrap = null;
        this.cloneBeforeItem = null;
        this.cloneAfterItem = null;
        this.autoPlayId = null;
        this.resizeBeforeWidth = null;
        this.resizeAfterWidth = null;
        this.isAutoPlay = false;
        this.isSliding = false;
        this.isOnStop = null;
        this.itemWidth = null;

        // カルーセルの初期配置設定
        this.nowPosition = 0;
        this.isCurrentNum = 1;
      };

      Carousel.prototype = {
        /**
         * 定義したカルーセル機能の呼び出し管理用関数
         * @returns {void}
         */
        init: function () {
          this.addElementClasses();
          this.setInitItems();
          this.cloneSlider();
          this.setController();
        },

        /**
         * DOM要素の追加生成と属性の付与
         * @returns {void}
         */
        addElementClasses: function () {
          const addSpan = function (el, cl, txt) {
            const span = document.createElement('span');
            let i = 0;

            for (; i < cl.length; i++) {
              el.classList.add(cl[i]);
            }
            el.setAttribute('type', 'button');
            el.appendChild(span);
            span.textContent = txt;
          };

          addSpan(this.nextButton, [this.nextClass], '次のスライドを表示');
          addSpan(this.prevButton, [this.prevClass], '前のスライドを表示');
          this.playerWrap.classList.add(this.playerWrapClass);
          this.indicatorWrap.classList.add(this.indicatorWrapClass);

          if (this.autoPlay) {
            addSpan(this.playButton, [this.playClass, this.autoPlayHookClass], '自動再生を開始');
            addSpan(this.pauseButton, [this.pauseClass, this.autoPlayHookClass], '自動再生を停止');
          }
        },

        /**
         * カルーセルアイテムの初期配置
         * @returns {void}
         */
        setInitItems: function () {
          const self = this;

          this.wrap.style.position = 'absolute';
          this.wrap.style.top = 0;
          this.item.forEach(function (el) {
            el.style.position = 'absolute';
          });

          if (this.itemLength === 1) {
            this.column = 1;
          }

          if (this.animationType === 'slide') {
            this.slideInner.style.transitionDuration = (this.duration / 1000) + 's';
            this.slideInner.style.transitionTimingFunction = this.eaing;
          }

          if (this.colMargin && this.column > 1) {
            this.item.style.marginRight = this.colMargin + 'px';
          }

          if (this.animationType === 'fade') {
            this.item.forEach(function (el, num) {
              let styles = el.style;

              styles.top = 0;
              styles.left = 0;
              styles.opacity = 0;
              styles.transitionDuration = '0s';
              styles.transitionTimingFunction = self.eaing;

              if (num === 0) {
                el.style.opacity = 1;
              }
            });

            setTimeout(function () {
              self.item.forEach(function (el) {
                el.style.transitionDuration = self.duration / 1000 + 's';
              });
            }, 20);
          }
        },

        /**
         * 無限ループ用のカルーセルの複製
         * @returns {void}
         */
        cloneSlider: function () {
          const cloneElement1 = this.wrap.cloneNode(true);
          const cloneElement2 = this.wrap.cloneNode(true);

          cloneElement1.classList.add('is-clone', 'is-clone-after');
          cloneElement2.classList.add('is-clone', 'is-clone-before');
          this.slideInner.appendChild(cloneElement1);
          this.slideInner.insertBefore(cloneElement2, this.slideInner.firstChild);

          this.cloneBeforeWrap = this.slideInner.querySelector('.is-clone-before');
          this.cloneAfterWrap = this.slideInner.querySelector('.is-clone-after');
          this.cloneBeforeItem = this.cloneBeforeWrap.querySelectorAll('.' + this.itemClass);
          this.cloneAfterItem = this.cloneAfterWrap.querySelectorAll('.' + this.itemClass);

          this.cloneBeforeItem.forEach(function (el) {
            const focusable = el.querySelectorAll(FOCUSABLE);

            el.setAttribute('aria-hidden', true);
            focusable.forEach(function (el) {
              el.setAttribute('tabindex', -1);
            });
          });

          this.cloneAfterItem.forEach(function (el) {
            const focusable = el.querySelectorAll(FOCUSABLE);

            el.setAttribute('aria-hidden', true);
            focusable.forEach(function (el) {
              el.setAttribute('tabindex', -1);
            });
          });
        },

        /**
         * スライド操作に必要な要素の配置
         * @returns {void}
         */
        setController: function() {
          let flagment = document.createDocumentFragment();
          let i = 0;

          // インジケーターの生成
          for (; i < this.itemLength; i++) {
            const li = document.createElement('li');
            const button = document.createElement('button');
            const span = document.createElement('span');

            button.classList.add(this.indicatorClass);
            button.setAttribute('type', 'button');
            span.classList.add('indicator-index');
            span.setAttribute('data-current', i + 1);
            span.textContent = (i + 1) + '番目のスライドを表示';
            button.appendChild(span);
            li.appendChild(button);
            flagment.appendChild(li);
          }

          // 各種要素の配置
          this.root.appendChild(this.nextButton);
          this.root.insertBefore(this.prevButton, this.root.firstChild);
          this.root.appendChild(this.playerWrap);
          this.indicatorWrap.appendChild(flagment);
          this.playerWrap.appendChild(this.indicatorWrap);

          // class名の付与
          this.indicator = this.indicatorWrap.querySelectorAll('.' + this.indicatorClass);
          this.indicator[0].classList.add('-is-active');

          if (this.autoPlay) {
            this.playerWrap.appendChild(this.pauseButton);
            this.isAutoPlay = true;
          }
        },

        /**
         * カルーセルアイテムのカラム割と横軸配置
         * 画面リサイズの度に処理を行う
         * @returns {void}
         */
        setColItems: function () {
          const self = this;
          let i = 0;
          let colMargin;

          if (this.isSliding) {
            return;
          }

          if (this.animationType === 'slide') {
            if (this.column === 1) {
              this.item.forEach(function (el) {
                el.style.width = '100%';
              });
            }
          }
        }

      };

      const carousel = new Carousel();
      carousel.init();
    });
  }

}
