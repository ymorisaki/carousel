export function setCarousel() {
  'use strict';

  const FOCUSABLE = 'a, area, input, button, select, option, textarea, output, summary, video, audio, object, embed, iframe';
  const TRANSITIONEND = 'transitionend';
  const UA = navigator.userAgent.toLowerCase();

  initCarousel('.js-carousel', {
    autoPlay: true,
    column: 2,
    // spColumn: 1,
    colMargin: 20,
    // easing: 'ease-in-out',
    playInterval: 5000,
    // duration: 1000,
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
        let self = this;

        // DOMオブジェクト
        this.root = root;
        this.slideWrap = root.querySelector('.' + o.slideWrap);
        this.slideInner = root.querySelector('.' + o.slideInner);
        this.wrap = root.querySelector('.' + o.wrap);
        this.item = root.querySelectorAll('.' + o.item);
        this.itemLength = this.item.length;
        this.focusableItem = [];
        this.item.forEach(function (el) {
          let i = 0;
          let targets = el.querySelectorAll(FOCUSABLE);

          for (; i < targets.length; i++) {
            self.focusableItem.push(targets[i]);
          }
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
        this.easing = o.easing;
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
          this.changeTabIndex();
          this.clickHandler();
          this.resizeHandler();
          this.hoverHandler();
          this.keyHandler();

          if (this.swipe) {
              this.swipeHandler();
          }

          if (this.autoPlay) {
              this.startAutoPlay();
          }

          if (this.animationType === 'fade') {
              this.column = 1;
          }

          this.trigger(window, 'resize');
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
          let self = this;

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
            this.slideInner.style.transitionTimingFunction = this.easing;
          }

          if (this.colMargin && this.column > 1) {
            this.item.forEach(function (el) {
              el.style.marginRight = self.colMargin + 'px';
            });
          }

          if (this.animationType === 'fade') {
            let self = this;
            let promiseFunc = function () {
              return new Promise(function (resolve) {
                self.item.forEach(function (el, num) {
                  let styles = el.style;

                  styles.top = 0;
                  styles.left = 0;
                  styles.opacity = 0;
                  styles.transitionDuration = '0s';
                  styles.transitionTimingFunction = self.easing;

                  if (num === 0) {
                    el.style.opacity = 1;
                  }
                });
                resolve();
              });
            };

            promiseFunc().then(function () {
              self.item.forEach(function (el) {
                el.style.transitionDuration = self.duration / 1000 + 's';
              });
            });
          }
        },

        /**
         * 無限ループ用のカルーセルの複製
         * @returns {void}
         */
        cloneSlider: function () {
          if (this.animationType === 'fade') {
            return;
          }

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
          let self = this;
          let i = 0;
          let maxLength = this.itemLength;
          let styles = null;

          if (this.isSliding) {
            return;
          }

          if (this.animationType === 'slide') {
            // カラムオプション変更とリサイズによるアイテム幅の計算
            if (this.column === 1) {
              this.item.forEach(function (el) {
                el.style.width = '100%';
              });

              this.cloneBeforeItem.forEach(function (el) {
                el.style.width = '100%';
              });

              this.cloneAfterItem.forEach(function (el) {
                el.style.width = '100%';
              });

              styles = window.getComputedStyle(this.item[0]);
              this.itemWidth = this.item[0].getBoundingClientRect().width;
              this.colMargin = parseInt(styles.marginRight.replace(/px/, ''));
            } else {
              this.item.forEach(function (el) {
                el.style.width = 'calc(' + (100 / self.column) + '% - ' + (self.colMargin / self.column * (self.column - 1)) + 'px)';
              });

              this.cloneBeforeItem.forEach(function (el) {
                el.style.width = 'calc(' + (100 / self.column) + '% - ' + (self.colMargin / self.column * (self.column - 1)) + 'px)';
              });

              this.cloneAfterItem.forEach(function (el) {
                el.style.width = 'calc(' + (100 / self.column) + '% - ' + (self.colMargin / self.column * (self.column - 1)) + 'px)';
              });

              styles = window.getComputedStyle(this.item[0]);
              this.itemWidth = this.item[0].getBoundingClientRect().width;
              this.colMargin = parseInt(styles.marginRight.replace(/px/, ''));
              this.itemWidth = this.itemWidth + this.colMargin;
            }
          }

          // クローンしたパネルの配置
          for (; i < maxLength; i++) {
            this.item[i].style.left = (this.itemWidth * i) + 'px';

            if (this.animationType === 'slide') {
              this.cloneBeforeItem[i].style.left = (this.itemWidth * i) + 'px';
              this.cloneAfterItem[i].style.left = (this.itemWidth * i) + 'px';
            }
          }

          if (this.animationType === 'slide') {
            // クローンしたパネルのラッパーを左右に配置
            this.cloneBeforeWrap.style.left = '-' + (this.itemWidth * this.itemLength) + 'px';
            this.cloneAfterWrap.style.left = (this.itemWidth * this.itemLength) + 'px';
          }

          // スライド全体の再配置（動作未確認注意）
          if (this.isCurrentNum !== 1) {
            let self = this;
            let promiseFunc = function () {
              return new Promise(function (resolve) {
                self.slideInner.style.left = '-' + (self.itemWidth * (self.isCurrentNum - 1)) + 'px';
                self.slideInner.style.transitionDuration = '0s';
                styles = window.getComputedStyle(self.slideInner);
                resolve();
              });
            };
            promiseFunc().then(function () {
              self.slideInner.style.transitionDuration = (self.duration / 1000) + 's';
              self.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);
            });
          }
        },

        /**
         * 一つ先にスライドする処理
         * @return {void}
         */
        nextSlide: function () {
          let styles = null;
          let elWidth = null;

          if (this.isSliding) {
            return;
          }

          this.isSliding = true;
          this.isCurrentNum++;
          this.resizeBeforeWidth = window.innerWidth;

          if (this.animationType === 'slide') {
            styles = window.getComputedStyle(this.item[0]);
            this.itemWidth = this.item[0].getBoundingClientRect().width;
            this.colMargin = parseInt(styles.marginRight.replace(/px/, ''));
            elWidth = this.itemWidth + this.colMargin;

            this.slideInner.style.left = '-' + (elWidth + this.nowPosition) + 'px';

            // 無限ループ時にインジケーターを最初に戻す
            if (this.isCurrentNum === this.itemLength + 1) {
              this.indicatorUpdate(0);

              return;
            }
          }

          if (this.animationType === 'fade') {
            this.item[this.isCurrentNum - 2].style.opacity = 0;

            if (this.isCurrentNum <= this.itemLength) {
              this.item[this.isCurrentNum - 1].style.opacity = 1;
            }

            if (this.isCurrentNum === this.itemLength + 1) {
              this.item[this.isCurrentNum - 2].style.opacity = 0;
              this.item[0].style.opacity = 1;
              this.indicatorUpdate(0);
              this.isCurrentNum = 1;

              return;
            }
          }

          // インジケーター同期
          this.indicatorUpdate(this.isCurrentNum - 1);
        },

        /**
         * 一つ先にスライドする処理（無限ループ切り替え時）
         * @return {void}
         */
        nextInfiniteLoop: function () {
          let self = this;

          if (this.animationType === 'slide') {
            this.slideInner.style.transitionDuration = '0s';

            setTimeout(function () {
              self.slideInner.style.left = 0;
            }, 20);

            // 現在のカレントとleft位置を初期化
            this.isCurrentNum = 1;
            this.nowPosition = 0;

            setTimeout(function () {
              self.slideInner.style.transitionDuration = (self.duration / 1000) + 's';
              self.isSliding = false;
            }, 40);
          }
        },

        /**
         * 一つ前にスライドする処理
         * @return {void}
         */
        prevSlide: function () {
          let styles = null;
          let elWidth = null;

          if (this.isSliding) {
            return;
          }

          this.isSliding = true;
          this.isCurrentNum--;
          this.resizeBeforeWidth = window.innerWidth;

          if (this.animationType === 'slide') {
            styles = window.getComputedStyle(this.item[0]);
            elWidth = this.item[0].getBoundingClientRect().width;
            this.colMargin = parseInt(styles.marginRight.replace(/px/, ''));
            this.itemWidth = elWidth + this.colMargin;

            if (this.isCurrentNum === 0) {
              this.slideInner.style.left = (this.nowPosition + this.itemWidth) + 'px';
            } else if (this.isCurrentNum === 1) {
              this.slideInner.style.left = 0;
            } else {
              this.slideInner.style.left = '-' + (this.nowPosition - this.itemWidth) + 'px';
            }
          }

          if (this.animationType === 'fade') {
            if (this.isCurrentNum === 0) {
              this.item[0].style.opacity = 0;
              this.item[this.itemLength - 1].style.opacity = 1;
              this.isCurrentNum = this.itemLength;
            } else {
              this.item[this.isCurrentNum].style.opacity = 0;
              this.item[this.isCurrentNum - 1].style.opacity = 1;
            }
          }

          // インジケーター同期
          if (this.isCurrentNum === 0) {
            this.indicatorUpdate(this.itemLength - 1);
          } else {
            this.indicatorUpdate(this.isCurrentNum - 1);
          }
        },

        /**
         * 一つ前にスライドする処理（無限ループ切り替え時）
         * @return {void}
         */
        prevInfiniteLoop: function () {
          let self = this;
          let targetPosition = null;
          let styles = window.getComputedStyle(this.item[0]);
          let elWidth = this.item[0].getBoundingClientRect().width;
          let promiseFunc = function () {
            return new Promise(function (resolve) {

            self.colMargin = parseInt(styles.marginRight.replace(/px/, ''));
            self.itemWidth = elWidth + self.colMargin;

            targetPosition = self.itemWidth * (self.itemLength - (self.column - (self.column - 1)));

            self.slideInner.style.transitionDuration = '0s';
            self.slideInner.style.left = '-' + targetPosition + 'px';

            // 現在のカレントとleft位置を初期化
            styles = window.getComputedStyle(self.slideInner);
            self.isCurrentNum = self.itemLength;
            self.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);
            resolve();
            });
          };

          promiseFunc().then(function () {
            self.slideInner.style.transitionDuration = (self.duration / 1000) + 's';
            self.isSliding = false;
          });
        },

        /**
         * 任意の箇所にスライドする処理
         * @param {object} e - クリックされたインジケーター
         * @return {void}
         */
        targetSlide: function (e) {
          let targetNum = e.target.querySelector('.indicator-index').getAttribute('data-current');

          if (this.isSliding) {
            return;
          }

          this.isSliding = true;
          this.resizeBeforeWidth = window.innerWidth;
          this.indicatorUpdate(targetNum - 1);
          this.isCurrentNum = parseInt(targetNum, 10);

          if (this.animationType === 'slide') {
            this.slideInner.style.left = '-' + (this.itemWidth * (targetNum - 1)) + 'px';
          }

          if (this.animationType === 'fade') {
            this.item.forEach(function (el) {
              el.style.opacity = 0;
            });
            this.item[this.isCurrentNum - 1].style.opacity = 1;
          }
        },

        /**
         * スライド時のタブインデックス操作
         * @return {void}
         */
        changeTabIndex: function () {
          let self = this;
          const setTabIndex = function (target, addNum) {
            const changeTarget = self.item[target].querySelectorAll(FOCUSABLE);
            changeTarget.forEach(function (el) {
              el.setAttribute('tabindex', addNum);
            });
          };
          const setCloneTabIndex = function (target, addNum) {
            const changeTarget = self.cloneAfterItem[target].querySelectorAll(FOCUSABLE);
            changeTarget.forEach(function (el) {
              el.setAttribute('tabindex', addNum);
            });
          };

          this.focusableItem.forEach(function (el) {
            el.setAttribute('tabindex', -1);
          });

          if (this.animationType === 'slide') {
            const afterFocusable = this.cloneAfterWrap.querySelectorAll(FOCUSABLE);
            afterFocusable.forEach(function (el) {
              el.setAttribute('tabindex', -1);
            });
          }

          switch (this.column) {
          case 1:
              if (this.isCurrentNum === this.itemLength + 1) {
                  setTabIndex(0, 0);

                  return;
              }

              if (this.isCurrentNum === 0) {
                  setTabIndex(this.itemLength - 1, 0);

                  return;
              }

              setTabIndex(this.isCurrentNum - 1, 0);
              break;

          case 2:
              // 最初のアイテムにカレント時
              if (this.isCurrentNum === 0) {
                  setTabIndex(this.itemLength - 1, 0);
                  setCloneTabIndex(0, 0);

                  return;
              }

              // 最後から二番目のアイテムにカレント時
              if (this.isCurrentNum === this.itemLength) {
                  setTabIndex(this.isCurrentNum - 1, 0);
                  setCloneTabIndex(0, 0);

                  return;
              }

              // 最後のアイテムにカレント時
              if (this.isCurrentNum === this.itemLength + 1) {
                  setTabIndex(0, 0);
                  setTabIndex(1, 0);

                  return;
              }

              setTabIndex(this.isCurrentNum - 1, 0);
              setTabIndex(this.isCurrentNum, 0);
              break;

          case 3:
              // 最初のアイテムにカレント時
              if (this.isCurrentNum === 0) {
                  setTabIndex(this.itemLength - 1, 0);
                  setCloneTabIndex(0, 0);
                  setCloneTabIndex(1, 0);

                  return;
              }

              // 最後から三番目のアイテムにカレント時
              if (this.isCurrentNum === this.itemLength - 1) {
                  setTabIndex(this.isCurrentNum, 0);
                  setTabIndex(this.isCurrentNum - 1, 0);
                  setCloneTabIndex(0, 0);

                  return;
              }

              // 最後から二番目のアイテムにカレント時
              if (this.isCurrentNum === this.itemLength) {
                  setTabIndex(this.isCurrentNum - 1, 0);
                  setCloneTabIndex(0, 0);
                  setCloneTabIndex(1, 0);

                  return;
              }

              // 最後のアイテムにカレント時
              if (this.isCurrentNum === this.itemLength + 1) {
                  setTabIndex(0, 0);
                  setTabIndex(1, 0);
                  setTabIndex(2, 0);

                  return;
              }

              setTabIndex(this.isCurrentNum - 1, 0);
              setTabIndex(this.isCurrentNum, 0);
              setTabIndex(this.isCurrentNum + 1, 0);
              break;

          default:
              break;
          }
        },

        /**
         * マウスクリック時の処理
         * @return {void}
         */
        clickHandler: function () {
          let self = this;

          this.nextButton.addEventListener('click', function () {
            self.nextSlide();
            self.changeTabIndex();
            if (self.autoPlay && self.isAutoPlay) {
              self.resetAutoPlayTime();
            }
          });

          this.prevButton.addEventListener('click', function () {
            self.prevSlide();
            self.focusableItem.forEach(function (el) {
              el.setAttribute('tabindex', -1);
            });
            self.changeTabIndex();
            if (self.autoPlay && self.isAutoPlay) {
                self.resetAutoPlayTime();
            }
          });

          this.indicator.forEach(function (el) {
            el.addEventListener('click', function (e) {
              if (e.target.classList.contains('-is-active')) {
                return;
              }

              self.targetSlide(e);
              self.changeTabIndex();
              if (self.autoPlay && self.isAutoPlay) {
                self.resetAutoPlayTime();
              }
            });
          });

          this.slideInner.addEventListener(TRANSITIONEND, function () {
            self.transitionHandler();
          });

          this.item.forEach(function (el) {
            el.addEventListener(TRANSITIONEND, function () {
              self.isSliding = false;
            });
          });

          this.pauseButton.addEventListener('click', function (e) {
            if (e.target.classList.contains(self.pauseClass)) {
              self.stopAutoPlay();
            } else {
              self.startAutoPlay();
            }
            self.changeAutoPlayIcon(e);
          });
        },

        /**
         * リサイズ時の処理
         * @return {void}
         */
        resizeHandler: function () {
          let self = this;
          let timeoutId = null;
          let windowWidth = null;

          window.addEventListener('resize', function () {
            if (self.animationType === 'slide') {
              self.resetAutoPlayTime();
            }

            if (timeoutId) {
              return;
            }

            timeoutId = setTimeout(function () {
              timeoutId = 0;
              windowWidth = window.innerWidth;

              if (self.spColumn) {
                self.changeBreakPoint(windowWidth);
              }

              self.setColItems();
              self.matchHeight();
            }, self.resizeThreshold);
          }, false);
        },

        /**
         * マウスホバー時の処理
         * @return {void}
         */
        hoverHandler: function () {
          let self = this;

          this.item.forEach(function (el) {
            el.addEventListener('mouseenter', function () {
              if (self.autoPlay && self.onStopPlay && self.isAutoPlay) {
                self.stopAutoPlay();
                self.isOnStop = true;
              }
            }, false);

            el.addEventListener('mouseleave', function () {
              if (self.autoPlay && self.onStopPlay && self.inOnStop) {
                self.startAutoPlay();
                self.inOnStop = false;
              }
            }, false);
          });
        },

        /**
         * キー操作時の処理
         * @return {void}
         */
        keyHandler: function () {
          let self = this;
          let tabEventCansel = function (e) {
            if (self.isSliding && self.animationType === 'slide' && e.key === 'Tab') {
              e.prevetDefault();
            }
          };

          this.nextButton.addEventListener('keydown', tabEventCansel);
          this.prevButton.addEventListener('keydown', tabEventCansel);

          if (UA.indexOf('edge') !== -1) {
            this.item.forEach(function (el) {
              el.addEventListener('keydown', tabEventCansel);
            });
          }

          if (UA.indexOf('trident/7') !== -1) {
            this.item.forEach(function (el) {
              el.addEventListener('keydown', tabEventCansel);
            });
          }
        },

        /**
         * スワイプ時の処理
         * @return {void}
         */
        swipeHandler: function () {
          let self = this;
          let mouseOnX = null;
          let mouseOutX = null;
          let eventCansel = function (e) {
              e.preventDefault();
          };

          this.slideInner.addEventListener('mousedown', function (e) {
            eventCansel(e);
            mouseOnX = e.pageX;
          });

          this.slideInner.addEventListener('mouseup', function (e) {
            mouseOutX = e.pageX;

            if (mouseOnX < mouseOutX) {
              self.slideInner.addEventListener('click', eventCansel);
              self.prevSlide();
              self.changeTabIndex();
              self.resetAutoPlayTime();
            } else if (mouseOutX < mouseOnX) {
              self.slideInner.addEventListener('click', eventCansel);
              self.nextSlide();
              self.changeTabIndex();
              self.resetAutoPlayTime();
            } else {
              self.slideInner.removeEventListener('click', eventCansel);
            }
          });
        },

        /**
         * トランジションアニメーション終了時の処理
         * @return {void}
         */
        transitionHandler: function () {
          let styles = window.getComputedStyle(this.slideInner);

          if (this.animationType === 'slide') {

            this.resizeAfterWidth = window.innerWidth;
            this.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);

            if (this.resizeBeforeWidth !== this.resizeAfterWidth) {
              this.setColItems();
              this.trigger(window, 'resize');
            }

            if (this.isCurrentNum > this.itemLength) {
              this.nextInfiniteLoop();

              return;
            }

            if (this.isCurrentNum === 0) {
              this.prevInfiniteLoop();

              return;
            }
            this.isSliding = false;
          }
        },

        /**
         * トリガーイベントの強制発生
         * @param {object} element 
         * @param {eventListener} event 
         */
        trigger: function (element, event) {
         if (document.createEvent) {
             var evt = document.createEvent('HTMLEvents');
             evt.initEvent(event, true, true);
             return element.dispatchEvent(evt);
         } else {
             var evt = document.createEventObject();
             return element.fireEvent('on' + event, evt)
         }
        },

        /**
         * ブレイクポイントのカラム切替処理
         * @param {number} width - リサイズ時のウィンドウ幅
         * @return {void}
         */
        changeBreakPoint: function (width) {
          if (width < this.breakPoint) {
            this.column = this.spColumn;
            if (this.spColumn === 1) {
              this.colMargin = 0;
            }
          } else {
            this.column = this.defalutColumn;
            this.colMargin = this.defalutMargin;
          }
        },

        /**
         * インジケーターのカレント同期
         * @param {number} currentTarget カレントをアクティブにしたい数値
         * @return {void}
         */
        indicatorUpdate: function (currentTarget) {
          this.indicator.forEach(function (el) {
            el.classList.remove('-is-active');
          });
          this.indicator[currentTarget].classList.add('-is-active');
        },

        /**
         * 自動再生開始機能
         * @return {void}
         */
        startAutoPlay: function () {
          let self = this;

          this.isAutoPlay = true;
          this.autoPlayId = setInterval(function () {
            self.nextSlide();
            self.changeTabIndex();
          }, this.playInterval);
        },

        /**
         * 自動再生停止機能
         * @return {void}
         */
        stopAutoPlay: function () {
          this.isAutoPlay = false;
          clearInterval(this.autoPlayId);
        },

        /**
         * 自動再生タイミングリセット機能
         * @return {void}
         */
        resetAutoPlayTime: function () {
          if (this.autoPlay && this.isAutoPlay) {
            let self = this;
            let promiseFunc = function () {
              return new Promise(function (resolve) {
                self.stopAutoPlay();
                resolve();
              });
            };

            promiseFunc().then(function () {
              self.startAutoPlay();
            });
          }
        },

        /**
         * 自動再生アイコンの変更処理
         * @param {object} e - 自動再生切替ボタン
         * @return {void}
         */
        changeAutoPlayIcon: function (e) {
          let target = e.currentTarget;
          
          if (target.classList.contains(this.pauseClass)) {
            target.classList.remove(this.pauseClass);
            target.classList.add(this.playClass);
            target.querySelector('span').textContent = '自動再生を開始';
          } else {
            target.classList.remove(this.playClass);
            target.classList.add(this.pauseClass);
            target.querySelector('span').textContent = '自動再生を停止';
          }
        },

        /**
         * 高さ揃え機能
         * @return {void}
         */
        matchHeight: function () {
          let i = 0;
          let maxLength = this.itemLength;
          let heightAry = [];

          this.wrap.style.height = '';
          this.item.forEach(function (el) {
            el.style.height = '';
          });

          for (; i < maxLength; i++) {
            heightAry.push(this.item[i].offsetHeight);
          }

          heightAry.sort(function (a, b) {
            return b - a;
          });

          this.slideInner.style.height = heightAry[0] + 'px';
          this.item.forEach(function (el) {
            el.style.height = heightAry[0] + 'px';
          });

          if (this.animationType === 'slide') {
            this.cloneBeforeWrap.style.height = heightAry[0] + 'px';
            this.cloneBeforeItem.forEach(function (el) {
              el.style.height = heightAry[0] + 'px';
            });

            this.cloneAfterWrap.style.height = heightAry[0] + 'px';
            this.cloneAfterItem.forEach(function (el) {
              el.style.height = heightAry[0] + 'px';
            });
          }
        }
      };

      const carousel = new Carousel();
      carousel.init();
    });
  }
}
