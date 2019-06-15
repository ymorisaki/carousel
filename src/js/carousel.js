(function () {
    'use strict';

    const FOCUSABLE = 'a, area, input, button, select, option, textarea, output, summary, video, audio, object, embed, iframe';
    const TRANSITIONEND = 'transitionend';
    const UA = navigator.userAgent.toLowerCase();

    /**
     * カルーセル機能
     * @constructor
     * @param {object} root カルーセル本体
     * @param {object} options インスタンス生成時に設定したオプション
     */
    const Carousel = function (root, options) {
        if (!(this instanceof Carousel)) {
            return new Carousel(root, options);
        }

        const self = this;
        const o = {
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

        Object.assign(o, options);

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

        // 動的に代入される設定
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
        if (this.animationType === 'fade') {
            this.column = 1;
        }

        // 機能実行
        this.addElementAndClasses();
        this.setInitItems();
        this.cloneSlider();
        this.setController();
        this.changeTabIndex();
        this.clickEvent();
        this.resizeEvent();
        this.hoverEvent();
        this.keyEvent();

        if (this.swipe) {
            this.swipeEvent();
        }

        if (this.autoPlay) {
            this.startAutoPlay();
        }

        this.forcedResize();
    };

    Carousel.prototype = {
        /**
         * DOM要素の追加生成と属性の付与
         * @returns {void}
         */
        addElementAndClasses: function () {
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

            self.wrap.style.position = 'absolute';
            self.wrap.style.top = 0;
            self.item.forEach(function (el) {
                el.style.position = 'absolute';
            });

            if (self.itemLength === 1) {
                self.column = 1;
            }

            if (self.animationType === 'slide') {
                self.slideInner.style.transitionDuration = (self.duration / 1000) + 's';
                self.slideInner.style.transitionTimingFunction = self.easing;
            }

            if (self.colMargin && self.column > 1) {
                self.item.forEach(function (el) {
                    el.style.marginRight = self.colMargin + 'px';
                });
            }

            if (self.animationType === 'fade') {
                const _self = this;
                const setStyles = function () {
                    return new Promise(function (resolve) {
                        _self.item.forEach(function (el, num) {
                            const styles = el.style;

                            styles.top = 0;
                            styles.left = 0;
                            styles.opacity = 0;
                            styles.transitionDuration = '0s';
                            styles.transitionTimingFunction = _self.easing;

                            if (num === 0) {
                                el.style.opacity = 1;
                            }
                        });
                        resolve();
                    });
                };

                setStyles().then(function () {
                    setTimeout(() => {
                        _self.item.forEach(function (el) {
                            el.style.transitionDuration = (_self.duration / 1000) + 's';
                        });
                    }, 10);
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

            cloneElement1.classList.add('is-clone');
            cloneElement1.classList.add('is-clone-after');
            cloneElement2.classList.add('is-clone');
            cloneElement2.classList.add('is-clone-before');

            this.slideInner.appendChild(cloneElement1);
            this.slideInner.insertBefore(cloneElement2, this.slideInner.firstChild);

            this.cloneBeforeWrap = this.slideInner.querySelector('.is-clone-before');
            this.cloneAfterWrap = this.slideInner.querySelector('.is-clone-after');
            this.cloneBeforeItem = this.cloneBeforeWrap.querySelectorAll('.' + this.itemClass);
            this.cloneAfterItem = this.cloneAfterWrap.querySelectorAll('.' + this.itemClass);

            this.cloneBeforeItem.forEach(function (el) {
                const focusable = el.querySelectorAll(FOCUSABLE);

                el.setAttribute('aria-hidden', true);
                focusable.forEach(function (elem) {
                    elem.tabIndex = -1;
                });
            });

            this.cloneAfterItem.forEach(function (el) {
                const focusable = el.querySelectorAll(FOCUSABLE);

                el.setAttribute('aria-hidden', true);
                focusable.forEach(function (elem) {
                    elem.tabIndex = -1;
                });
            });
        },

        /**
         * スライド操作に必要な要素の配置
         * @returns {void}
         */
        setController: function () {
            let fragment = document.createDocumentFragment();
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
                fragment.appendChild(li);
            }

            // 各種要素の配置
            this.root.appendChild(this.nextButton);
            this.root.insertBefore(this.prevButton, this.root.firstChild);
            this.root.appendChild(this.playerWrap);
            this.indicatorWrap.appendChild(fragment);
            this.playerWrap.appendChild(this.indicatorWrap);

            // class名の付与
            this.indicator = this.indicatorWrap.querySelectorAll('.' + this.indicatorClass);
            this.indicator[0].classList.add('is-active');

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
            let maxLength = self.itemLength;
            let styles = null;

            if (self.isSliding) {
                return;
            }

            if (self.animationType === 'slide') {
                // カラムオプション変更とリサイズによるアイテム幅の計算
                if (self.column === 1) {
                    self.item.forEach(function (el) {
                        el.style.width = '100%';
                    });

                    self.cloneBeforeItem.forEach(function (el) {
                        el.style.width = '100%';
                    });

                    self.cloneAfterItem.forEach(function (el) {
                        el.style.width = '100%';
                    });

                    styles = window.getComputedStyle(self.item[0]);
                    self.itemWidth = self.item[0].getBoundingClientRect().width;
                } else {
                    self.item.forEach(function (el) {
                        el.style.width = 'calc(' + (100 / self.column) + '% - ' + (self.colMargin / self.column * (self.column - 1)) + 'px)';
                    });

                    self.cloneBeforeItem.forEach(function (el) {
                        el.style.width = 'calc(' + (100 / self.column) + '% - ' + (self.colMargin / self.column * (self.column - 1)) + 'px)';
                    });

                    self.cloneAfterItem.forEach(function (el) {
                        el.style.width = 'calc(' + (100 / self.column) + '% - ' + (self.colMargin / self.column * (self.column - 1)) + 'px)';
                    });

                    styles = window.getComputedStyle(self.item[0]);
                    self.itemWidth = self.item[0].getBoundingClientRect().width;
                    self.colMargin = parseInt(styles.marginRight, 10);
                    self.itemWidth += self.colMargin;
                }
            }

            // クローンしたパネルの配置
            for (; i < maxLength; i++) {
                self.item[i].style.left = (self.itemWidth * i) + 'px';

                if (self.animationType === 'slide') {
                    self.cloneBeforeItem[i].style.left = (self.itemWidth * i) + 'px';
                    self.cloneAfterItem[i].style.left = (self.itemWidth * i) + 'px';
                }
            }

            if (self.animationType === 'slide') {
                // クローンしたパネルのラッパーを左右に配置
                self.cloneBeforeWrap.style.left = '-' + (self.itemWidth * self.itemLength) + 'px';
                self.cloneAfterWrap.style.left = (self.itemWidth * self.itemLength) + 'px';
            }

            // スライド全体の再配置（動作未確認注意）
            if (self.isCurrentNum !== 1) {
                const _self = this;
                const setSildePosition = function () {
                    return new Promise(function (resolve) {
                        _self.slideInner.style.left = '-' + (_self.itemWidth * (_self.isCurrentNum - 1)) + 'px';
                        _self.slideInner.style.transitionDuration = '0s';
                        styles = window.getComputedStyle(_self.slideInner);
                        resolve();
                    });
                };

                setSildePosition().then(function () {
                    _self.slideInner.style.transitionDuration = (_self.duration / 1000) + 's';
                    _self.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);
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
                elWidth = this.item[0].getBoundingClientRect().width;
                if (this.column === 1) {
                    this.itemWidth = elWidth;
                } else {
                    this.colMargin = parseInt(styles.marginRight, 10);
                    this.itemWidth = elWidth + this.colMargin;
                }

                this.slideInner.style.left = '-' + (this.itemWidth + this.nowPosition) + 'px';

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
            const self = this;

            if (self.animationType === 'slide') {
                self.slideInner.style.transitionDuration = '0s';

                setTimeout(function () {
                    self.slideInner.style.left = 0;
                }, 20);

                // 現在のカレントとleft位置を初期化
                self.isCurrentNum = 1;
                self.nowPosition = 0;

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
                this.colMargin = parseInt(styles.marginRight, 10);
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
            const self = this;
            let targetPosition = 0;
            let styles = window.getComputedStyle(self.item[0]);
            let elWidth = self.item[0].getBoundingClientRect().width;
            const initSlide = function () {
                return new Promise(function (resolve) {
                    self.colMargin = parseInt(styles.marginRight, 10);
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

            initSlide().then(function () {
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
            const targetNum = e.target.querySelector('.indicator-index').getAttribute('data-current');

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
            const self = this;
            const setTabIndex = function (target, addNum) {
                const changeTarget = self.item[target].querySelectorAll(FOCUSABLE);

                changeTarget.forEach(function (el) {
                    el.tabIndex = addNum;
                });
            };
            const setCloneTabIndex = function (target, addNum) {
                const changeTarget = self.cloneAfterItem[target].querySelectorAll(FOCUSABLE);

                changeTarget.forEach(function (el) {
                    el.tabIndex = addNum;
                });
            };

            self.focusableItem.forEach(function (el) {
                el.tabIndex = -1;
            });

            if (self.animationType === 'slide') {
                const afterFocusable = self.cloneAfterWrap.querySelectorAll(FOCUSABLE);

                afterFocusable.forEach(function (el) {
                    el.tabIndex = -1;
                });
            }

            switch (self.column) {
            case 1:
                if (self.isCurrentNum === self.itemLength + 1) {
                    setTabIndex(0, 0);

                    return;
                }

                if (self.isCurrentNum === 0) {
                    setTabIndex(self.itemLength - 1, 0);

                    return;
                }

                setTabIndex(self.isCurrentNum - 1, 0);
                break;

            case 2:
                // 最初のアイテムにカレント時
                if (self.isCurrentNum === 0) {
                    setTabIndex(self.itemLength - 1, 0);
                    setCloneTabIndex(0, 0);

                    return;
                }

                // 最後から二番目のアイテムにカレント時
                if (self.isCurrentNum === self.itemLength) {
                    setTabIndex(self.isCurrentNum - 1, 0);
                    setCloneTabIndex(0, 0);

                    return;
                }

                // 最後のアイテムにカレント時
                if (self.isCurrentNum === self.itemLength + 1) {
                    setTabIndex(0, 0);
                    setTabIndex(1, 0);

                    return;
                }

                setTabIndex(self.isCurrentNum - 1, 0);
                setTabIndex(self.isCurrentNum, 0);
                break;

            case 3:
                // 最初のアイテムにカレント時
                if (self.isCurrentNum === 0) {
                    setTabIndex(self.itemLength - 1, 0);
                    setCloneTabIndex(0, 0);
                    setCloneTabIndex(1, 0);

                    return;
                }

                // 最後から三番目のアイテムにカレント時
                if (self.isCurrentNum === self.itemLength - 1) {
                    setTabIndex(self.isCurrentNum, 0);
                    setTabIndex(self.isCurrentNum - 1, 0);
                    setCloneTabIndex(0, 0);

                    return;
                }

                // 最後から二番目のアイテムにカレント時
                if (self.isCurrentNum === self.itemLength) {
                    setTabIndex(self.isCurrentNum - 1, 0);
                    setCloneTabIndex(0, 0);
                    setCloneTabIndex(1, 0);

                    return;
                }

                // 最後のアイテムにカレント時
                if (self.isCurrentNum === self.itemLength + 1) {
                    setTabIndex(0, 0);
                    setTabIndex(1, 0);
                    setTabIndex(2, 0);

                    return;
                }

                setTabIndex(self.isCurrentNum - 1, 0);
                setTabIndex(self.isCurrentNum, 0);
                setTabIndex(self.isCurrentNum + 1, 0);
                break;

            default:
                break;
            }
        },

        /**
         * マウスクリック時の処理
         * @return {void}
         */
        clickEvent: function () {
            const self = this;

            self.nextButton.addEventListener('click', function () {
                self.nextSlide();
                self.changeTabIndex();
                if (self.autoPlay && self.isAutoPlay) {
                    self.resetAutoPlayTime();
                }
            });

            self.prevButton.addEventListener('click', function () {
                self.prevSlide();
                self.focusableItem.forEach(function (el) {
                    el.tabIndex = -1;
                });
                self.changeTabIndex();
                if (self.autoPlay && self.isAutoPlay) {
                    self.resetAutoPlayTime();
                }
            });

            self.indicator.forEach(function (el) {
                el.addEventListener('click', function (e) {
                    if (e.target.classList.contains('is-active')) {
                        return;
                    }

                    self.targetSlide(e);
                    self.changeTabIndex();
                    if (self.autoPlay && self.isAutoPlay) {
                        self.resetAutoPlayTime();
                    }
                });
            });

            self.slideInner.addEventListener(TRANSITIONEND, function () {
                self.transitionAfter();
            });

            self.item.forEach(function (el) {
                el.addEventListener(TRANSITIONEND, function () {
                    self.isSliding = false;
                });
            });

            self.pauseButton.addEventListener('click', function (e) {
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
        resizeEvent: function () {
            const self = this;
            let timeoutId = 0;
            let windowWidth = 0;

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
        hoverEvent: function () {
            const self = this;

            self.item.forEach(function (el) {
                el.addEventListener('mouseenter', function () {
                    if (self.autoPlay && self.onStopPlay && self.isAutoPlay) {
                        self.stopAutoPlay();
                        self.isOnStop = true;
                    }
                }, false);

                el.addEventListener('mouseleave', function () {
                    if (self.autoPlay && self.onStopPlay && self.isOnStop) {
                        self.startAutoPlay();
                        self.isOnStop = false;
                    }
                }, false);
            });
        },

        /**
         * キー操作時の処理
         * @return {void}
         */
        keyEvent: function () {
            const self = this;
            const tabEventCansel = function (e) {
                if (self.isSliding && self.animationType === 'slide' && e.key === 'Tab') {
                    e.preventDefault();
                }
            };

            self.nextButton.addEventListener('keydown', tabEventCansel);
            self.prevButton.addEventListener('keydown', tabEventCansel);

            if (UA.indexOf('edge') !== -1) {
                self.item.forEach(function (el) {
                    el.addEventListener('keydown', tabEventCansel);
                });
            }

            if (UA.indexOf('trident/7') !== -1) {
                self.item.forEach(function (el) {
                    el.addEventListener('keydown', tabEventCansel);
                });
            }
        },

        /**
         * スワイプ時の処理
         * @returns {void}
         */
        swipeEvent: function () {
            const self = this;
            const touchMargin = 30;
            let touchOnX = null;
            let touchOutX = null;

            self.root.addEventListener('touchstart', function (e) {
                touchOnX = e.changedTouches[0].pageX;
            }, {passive: true});

            self.root.addEventListener('touchend', function (e) {
                touchOutX = e.changedTouches[0].pageX;

                if (touchOnX + touchMargin < touchOutX) {
                    self.prevSlide();
                    self.changeTabIndex();
                    self.resetAutoPlayTime();
                } else if (touchOutX + touchMargin < touchOnX) {
                    self.nextSlide();
                    self.changeTabIndex();
                    self.resetAutoPlayTime();
                }
            }, {passive: true});
        },


        /**
         * トランジションアニメーション終了時の処理
         * @return {void}
         */
        transitionAfter: function () {
            const styles = window.getComputedStyle(this.slideInner);

            if (this.animationType === 'slide') {
                this.resizeAfterWidth = window.innerWidth;
                this.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);

                if (this.resizeBeforeWidth !== this.resizeAfterWidth) {
                    this.setColItems();
                    this.forcedResize();
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
         * 初回読み込み時にトリガーイベントの強制発生
         * @returns {void}
         */
        forcedResize: function () {
            const resize = new Event('resize');

            window.dispatchEvent(resize);
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
                el.classList.remove('is-active');
            });
            this.indicator[currentTarget].classList.add('is-active');
        },

        /**
         * 自動再生開始機能
         * @return {void}
         */
        startAutoPlay: function () {
            const self = this;

            self.isAutoPlay = true;
            self.autoPlayId = setInterval(function () {
                self.nextSlide();
                self.changeTabIndex();
            }, self.playInterval);
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
                const self = this;
                const resetAutoPlay = function () {
                    return new Promise(function (resolve) {
                        self.stopAutoPlay();
                        resolve();
                    });
                };

                resetAutoPlay().then(function () {
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
            const target = e.currentTarget;

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
            const maxLength = this.itemLength;
            const heightAry = [];
            let i = 0;

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

    // インスタンス生成
    document.querySelectorAll('.js-carousel-fade-01').forEach(function (el) {
        Carousel(el, {
            animationType: 'fade',
            playInterval: 3000,
            duration: 1500,
            autoPlay: true
        });
    });

    document.querySelectorAll('.js-carousel-slide-01').forEach(function (el) {
        Carousel(el, {
            playInterval: 4000,
            autoPlay: true
        });
    });

    document.querySelectorAll('.js-carousel-slide-02').forEach(function (el) {
        Carousel(el, {
            column: 2,
            colMargin: 20,
            spColumn: 1,
            playInterval: 5000,
            autoPlay: true
        });
    });

    document.querySelectorAll('.js-carousel-slide-03').forEach(function (el) {
        Carousel(el, {
            column: 3,
            colMargin: 10,
            spColumn: 2,
            playInterval: 4000,
            autoPlay: true
        });
    });
}());
