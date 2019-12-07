const FOCUSABLE = 'a, area, input, button, select, option, textarea, output, summary, video, audio, object, embed, iframe';
const TRANSITIONEND = 'transitionend';
const UA = navigator.userAgent.toLowerCase();

class Carousel {
    constructor(root, options) {
        this.root = root;

        if (!this.root) {
            return;
        }

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
            autoPlay: true,
            onStopPlay: true,
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
        this.slideWrap = root.querySelector(`.${o.slideWrap}`);
        this.slideInner = root.querySelector(`.${o.slideInner}`);
        this.wrap = root.querySelector(`.${o.wrap}`);
        this.item = root.querySelectorAll(`.${o.item}`);
        this.itemLength = this.item.length;
        this.focusableItem = [];
        this.item.forEach((element) => {
            const targets = element.querySelectorAll(FOCUSABLE);

            for (let i = 0; i < targets.length; i++) {
                this.focusableItem.push(targets[i]);
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
        this.autoPlayId = 0;
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
    }

    /*
     * DOM要素の追加生成と属性の付与
     */
    addElementAndClasses() {
        const addSpan = (element, klass, txt) => {
            const span = document.createElement('span');

            for (let i = 0; i < klass.length; i++) {
                element.classList.add(klass[i]);
            }

            element.setAttribute('type', 'button');
            element.appendChild(span);
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
    }

    /*
     * カルーセルアイテムの初期配置
     */
    setInitItems() {
        this.wrap.style.position = 'absolute';
        this.wrap.style.top = 0;
        this.item.forEach((element) => {
            element.style.position = 'absolute';
        });

        if (this.itemLength === 1) {
            this.column = 1;
        }

        if (this.animationType === 'slide') {
            this.slideInner.style.transitionDuration = `${(this.duration / 1000)}s`;
            this.slideInner.style.transitionTimingFunction = this.easing;
        }

        if (this.colMargin && this.column > 1) {
            this.item.forEach((element) => {
                element.style.marginRight = `${this.colMargin}px`;
            });
        }

        if (this.animationType === 'fade') {
            const setStyles = () => {
                return new Promise((resolve) => {
                    this.item.forEach((element, num) => {
                        const styles = element.style;

                        styles.top = 0;
                        styles.left = 0;
                        styles.opacity = 0;
                        styles.transitionDuration = '0s';
                        styles.transitionTimingFunction = this.easing;

                        if (num === 0) {
                            element.style.opacity = 1;
                        }
                    });
                    resolve();
                });
            };

            setStyles().then(() => {
                setTimeout(() => {
                    this.item.forEach((element) => {
                        element.style.transitionDuration = `${(this.duration / 1000)}s`;
                    });
                }, 10);
            });
        }
    }

    /*
     * 無限ループ用のカルーセルの複製
     */
    cloneSlider() {
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
        this.cloneBeforeItem = this.cloneBeforeWrap.querySelectorAll(`.${this.itemClass}`);
        this.cloneAfterItem = this.cloneAfterWrap.querySelectorAll(`.${this.itemClass}`);

        this.cloneBeforeItem.forEach((element) => {
            const focusable = element.querySelectorAll(FOCUSABLE);

            element.setAttribute('aria-hidden', true);
            focusable.forEach((element) => {
                element.tabIndex = -1;
            });
        });

        this.cloneAfterItem.forEach((element) => {
            const focusable = element.querySelectorAll(FOCUSABLE);

            element.setAttribute('aria-hidden', true);
            focusable.forEach((element) => {
                element.tabIndex = -1;
            });
        });
    }

    /*
     * スライド操作に必要な要素の配置
     */
    setController() {
        const fragment = document.createDocumentFragment();

        // インジケーターの生成
        for (let i = 0; i < this.itemLength; i++) {
            const li = document.createElement('li');
            const button = document.createElement('button');
            const span = document.createElement('span');

            button.classList.add(this.indicatorClass);
            button.setAttribute('type', 'button');
            span.classList.add('indicator-index');
            span.setAttribute('data-current', i + 1);
            span.textContent = `${(i + 1)}番目のスライドを表示`;
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
        this.indicator = this.indicatorWrap.querySelectorAll(`.${this.indicatorClass}`);
        this.indicator[0].classList.add('is-active');

        if (this.autoPlay) {
            this.playerWrap.appendChild(this.pauseButton);
            this.isAutoPlay = true;
        }
    }

    /*
     * カルーセルアイテムのカラム割と横軸配置
     * 画面リサイズの度に処理を行う
     */
    setColItems() {
        const maxLength = this.itemLength;
        let styles = null;

        if (this.isSliding) {
            return;
        }

        if (this.animationType === 'slide') {
            // カラムオプション変更とリサイズによるアイテム幅の計算
            if (this.column === 1) {
                this.item.forEach((element) => {
                    element.style.width = '100%';
                });

                this.cloneBeforeItem.forEach((element) => {
                    element.style.width = '100%';
                });

                this.cloneAfterItem.forEach((element) => {
                    element.style.width = '100%';
                });

                styles = window.getComputedStyle(this.item[0]);
                this.itemWidth = this.item[0].getBoundingClientRect().width;
            } else {
                this.item.forEach((element) => {
                    element.style.width = `calc(${(100 / this.column)}% - ${(this.colMargin / this.column * (this.column - 1))}px)`;
                });

                this.cloneBeforeItem.forEach((element) => {
                    element.style.width = `calc(${(100 / this.column)}% - ${(this.colMargin / this.column * (this.column - 1))}px)`;
                });

                this.cloneAfterItem.forEach((element) => {
                    element.style.width = `calc(${(100 / this.column)}% - ${(this.colMargin / this.column * (this.column - 1))}px)`;
                });

                styles = window.getComputedStyle(this.item[0]);
                this.itemWidth = this.item[0].getBoundingClientRect().width;
                this.colMargin = parseInt(styles.marginRight, 10);
                this.itemWidth += this.colMargin;
            }
        }

        // クローンしたパネルの配置
        for (let i = 0; i < maxLength; i++) {
            this.item[i].style.left = `${(this.itemWidth * i)}px`;

            if (this.animationType === 'slide') {
                this.cloneBeforeItem[i].style.left = `${(this.itemWidth * i)}px`;
                this.cloneAfterItem[i].style.left = `${(this.itemWidth * i)}px`;
            }
        }

        if (this.animationType === 'slide') {
            // クローンしたパネルのラッパーを左右に配置
            this.cloneBeforeWrap.style.left = `-${(this.itemWidth * this.itemLength)}px`;
            this.cloneAfterWrap.style.left = `${(this.itemWidth * this.itemLength)}px`;
        }

        // スライド全体の再配置
        if (this.isCurrentNum !== 1) {
            const setSildePosition = () => new Promise((resolve) => {
                this.slideInner.style.left = `-${(this.itemWidth * (this.isCurrentNum - 1))}px`;
                this.slideInner.style.transitionDuration = '0s';
                styles = window.getComputedStyle(this.slideInner);
                resolve();
            })

            setSildePosition().then(() => {
                this.slideInner.style.transitionDuration = `${(this.duration / 1000)}s`;
                this.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);
            });
        }
    }

    /*
     * 一つ先にスライドする処理
     */
    nextSlide() {
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

            this.slideInner.style.left = `-${(this.itemWidth + this.nowPosition)}px`;

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
    }

    /*
     * 一つ先にスライドする処理（無限ループ切り替え時）
     */
    nextInfiniteLoop() {
        if (this.animationType === 'slide') {
            this.slideInner.style.transitionDuration = '0s';

            setTimeout(() => {
                this.slideInner.style.left = 0;
            }, 20);

            // 現在のカレントとleft位置を初期化
            this.isCurrentNum = 1;
            this.nowPosition = 0;

            setTimeout(() => {
                this.slideInner.style.transitionDuration = `${(this.duration / 1000)}s`;
                this.isSliding = false;
            }, 40);
        }
    }

    /*
     * 一つ前にスライドする処理
     */
    prevSlide() {
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
            if (this.column === 1) {
                this.itemWidth = elWidth;
            } else {
                this.colMargin = parseInt(styles.marginRight, 10);
                this.itemWidth = elWidth + this.colMargin;
            }

            if (this.isCurrentNum === 0) {
                this.slideInner.style.left = `${(this.nowPosition + this.itemWidth)}px`;
            } else if (this.isCurrentNum === 1) {
                this.slideInner.style.left = 0;
            } else {
                this.slideInner.style.left = `-${(this.nowPosition - this.itemWidth)}px`;
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
    }

    /*
     * 一つ前にスライドする処理（無限ループ切り替え時）
     */
    prevInfiniteLoop() {
        let targetPosition = 0;
        let styles = window.getComputedStyle(this.item[0]);
        let elWidth = this.item[0].getBoundingClientRect().width;
        const initSlide = () => new Promise((resolve) => {
            if (this.column === 1) {
                this.itemWidth = elWidth;
            } else {
                this.colMargin = parseInt(styles.marginRight, 10);
                this.itemWidth = elWidth + this.colMargin;
            }

            targetPosition = this.itemWidth * (this.itemLength - (this.column - (this.column - 1)));

            this.slideInner.style.transitionDuration = '0s';
            this.slideInner.style.left = `-${targetPosition}px`;

            // 現在のカレントとleft位置を初期化
            styles = window.getComputedStyle(this.slideInner);
            this.isCurrentNum = this.itemLength;
            this.nowPosition = parseInt(styles.left.match(/(\d+)/)[0], 10);
            resolve();
        });

        initSlide().then(() => {
            this.slideInner.style.transitionDuration = `${(this.duration / 1000)}s`;
            this.isSliding = false;
        });
    }

    /**
     * 任意の箇所にスライドする処理
     * @param {EventObject} e - クリックされたインジケーター
     * @return {void}
     */
    targetSlide(e) {
        const targetNum = e.target.querySelector('.indicator-index').getAttribute('data-current');

        if (this.isSliding) {
            return;
        }

        this.isSliding = true;
        this.resizeBeforeWidth = window.innerWidth;
        this.indicatorUpdate(targetNum - 1);
        this.isCurrentNum = parseInt(targetNum, 10);

        if (this.animationType === 'slide') {
            this.slideInner.style.left = `-${(this.itemWidth * (targetNum - 1))}px`;
        }

        if (this.animationType === 'fade') {
            this.item.forEach((element) => {
                element.style.opacity = 0;
            });
            this.item[this.isCurrentNum - 1].style.opacity = 1;
        }
    }

    /*
     * スライド時のタブインデックス操作
     */
    changeTabIndex() {
        const setTabIndex = (target, addNum) => {
            const changeTarget = this.item[target].querySelectorAll(FOCUSABLE);

            changeTarget.forEach((element) => {
                element.tabIndex = addNum;
            });
        };
        const setCloneTabIndex = (target, addNum) => {
            const changeTarget = this.cloneAfterItem[target].querySelectorAll(FOCUSABLE);

            changeTarget.forEach((element) => {
                element.tabIndex = addNum;
            });
        };

        this.focusableItem.forEach((element) => {
            element.tabIndex = -1;
        });

        if (this.animationType === 'slide') {
            const afterFocusable = this.cloneAfterWrap.querySelectorAll(FOCUSABLE);

            afterFocusable.forEach((element) => {
                element.tabIndex = -1;
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
    }

    /*
     * マウスクリック時の処理
     */
    clickEvent() {
        this.nextButton.addEventListener('click', () => {
            this.nextSlide();
            this.changeTabIndex();
            if (this.autoPlay && this.isAutoPlay) {
                this.resetAutoPlayTime();
            }
        });

        this.prevButton.addEventListener('click', () => {
            this.prevSlide();
            this.focusableItem.forEach((element) => {
                element.tabIndex = -1;
            });
            this.changeTabIndex();
            if (this.autoPlay && this.isAutoPlay) {
                this.resetAutoPlayTime();
            }
        });

        this.indicator.forEach((element) => {
            element.addEventListener('click', (e) => {
                if (e.target.classList.contains('is-active')) {
                    return;
                }

                this.targetSlide(e);
                this.changeTabIndex();
                if (this.autoPlay && this.isAutoPlay) {
                    this.resetAutoPlayTime();
                }
            });
        });

        this.slideInner.addEventListener(TRANSITIONEND, () => {
            this.transitionAfter();
        });

        this.item.forEach((element) => {
            element.addEventListener(TRANSITIONEND, () => {
                this.isSliding = false;
            });
        });

        this.pauseButton.addEventListener('click', (e) => {
            if (e.target.classList.contains(this.pauseClass)) {
                this.stopAutoPlay();
            } else {
                this.startAutoPlay();
            }
            this.changeAutoPlayIcon(e);
        });
    }

    /*
     * リサイズ時の処理
     */
    resizeEvent() {
        let timeoutId = 0;
        let windowWidth = 0;

        window.addEventListener('resize', () => {
            if (this.animationType === 'slide') {
                this.resetAutoPlayTime();
            }

            if (timeoutId) {
                return;
            }

            timeoutId = setTimeout(() => {
                timeoutId = 0;
                windowWidth = window.innerWidth;

                if (this.spColumn) {
                    this.changeBreakPoint(windowWidth);
                }

                this.setColItems();
                this.matchHeight();
            }, this.resizeThreshold);
        }, false);
    }

    /*
     * マウスホバー時の処理
     */
    hoverEvent() {
        this.item.forEach((element) => {
            element.addEventListener('mouseenter', () => {
                if (this.autoPlay && this.onStopPlay && this.isAutoPlay) {
                    this.stopAutoPlay();
                    this.isOnStop = true;
                }
            }, false);

            element.addEventListener('mouseleave', () => {
                if (this.autoPlay && this.onStopPlay && this.isOnStop) {
                    this.startAutoPlay();
                    this.isOnStop = false;
                }
            }, false);
        });
    }

    /*
     * キー操作時の処理
     */
    keyEvent() {
        const tabEventCansel = (e) => {
            if (this.isSliding && this.animationType === 'slide' && e.key === 'Tab') {
                e.preventDefault();
            }
        };

        this.nextButton.addEventListener('keydown', tabEventCansel);
        this.prevButton.addEventListener('keydown', tabEventCansel);

        if (UA.indexOf('edge') !== -1) {
            this.item.forEach((element) => {
                element.addEventListener('keydown', tabEventCansel);
            });
        }

        if (UA.indexOf('trident/7') !== -1) {
            this.item.forEach((element) => {
                element.addEventListener('keydown', tabEventCansel);
            });
        }
    }

    /*
     * スワイプ時の処理
     */
    swipeEvent() {
        const touchMargin = 30;
        let touchOnX = null;
        let touchOutX = null;

        this.root.addEventListener('touchstart', (e) => {
            touchOnX = e.changedTouches[0].pageX;
        }, {passive: true});

        this.root.addEventListener('touchend', (e) => {
            touchOutX = e.changedTouches[0].pageX;

            if (touchOnX + touchMargin < touchOutX) {
                this.prevSlide();
                this.changeTabIndex();
                this.resetAutoPlayTime();
            } else if (touchOutX + touchMargin < touchOnX) {
                this.nextSlide();
                this.changeTabIndex();
                this.resetAutoPlayTime();
            }
        }, {passive: true});
    }


    /*
     * トランジションアニメーション終了時の処理
     */
    transitionAfter() {
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
    }

    /**
     * 初回読み込み時にトリガーイベントの強制発生
        * @returns {void}
        */
    forcedResize() {
        const resize = new Event('resize');

        window.dispatchEvent(resize);
    }

    /**
     * ブレイクポイントのカラム切替処理
     * @param {number} width - リサイズ時のウィンドウ幅
     * @return {void}
     */
    changeBreakPoint(width) {
        if (width < this.breakPoint) {
            this.column = this.spColumn;
            if (this.spColumn === 1) {
                this.colMargin = 0;
            }
        } else {
            this.column = this.defalutColumn;
            this.colMargin = this.defalutMargin;
        }
    }

    /**
     * インジケーターのカレント同期
     * @param {number} currentTarget カレントをアクティブにしたい数値
     * @return {void}
     */
    indicatorUpdate(currentTarget) {
        this.indicator.forEach((element) => {
            element.classList.remove('is-active');
        });
        this.indicator[currentTarget].classList.add('is-active');
    }

    /*
     * 自動再生開始機能
     */
    startAutoPlay() {
        this.isAutoPlay = true;
        this.autoPlayId = setInterval(() => {
            this.nextSlide();
            this.changeTabIndex();
        }, this.playInterval);
    }

    /*
     * 自動再生停止機能
     */
    stopAutoPlay() {
        this.isAutoPlay = false;
        clearInterval(this.autoPlayId);
    }

    /*
     * 自動再生タイミングリセット機能
     */
    resetAutoPlayTime() {
        if (this.autoPlay && this.isAutoPlay) {
            const resetAutoPlay = () => new Promise((resolve) => {
                this.stopAutoPlay();
                resolve();
            });

            resetAutoPlay().then(() => {
                this.startAutoPlay();
            });
        }
    }

    /**
     * 自動再生アイコンの変更処理
     * @param {EventObject} e - 自動再生切替ボタン
     * @return {void}
     */
    changeAutoPlayIcon(e) {
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
    }

    /*
     * 高さ揃え機能
     */
    matchHeight() {
        const maxLength = this.itemLength;
        const heightAry = [];

        this.wrap.style.height = '';
        this.item.forEach((element) => {
            element.style.height = '';
        });

        for (let i = 0; i < maxLength; i++) {
            heightAry.push(this.item[i].offsetHeight);
        }

        heightAry.sort((a, b) => b - a);

        this.slideInner.style.height = `${heightAry[0]}px`;
        this.item.forEach((element) => {
            element.style.height = `${heightAry[0]}px`;
        });

        if (this.animationType === 'slide') {
            this.cloneBeforeWrap.style.height = `${heightAry[0]}px`;
            this.cloneBeforeItem.forEach((element) => {
                element.style.height = `${heightAry[0]}px`;
            });

            this.cloneAfterWrap.style.height = `${heightAry[0]}px`;
            this.cloneAfterItem.forEach((element) => {
                element.style.height = `${heightAry[0]}px`;
            });
        }
    }
}

export default function setCarousel() {
    document.querySelectorAll('.js-carousel-slide-02').forEach((element) => new Carousel(element, {
        column: 2,
        colMargin: 10
    }));

    document.querySelectorAll('.js-carousel-slide-03').forEach((element) => new Carousel(element, {
        column: 3,
        colMargin: 10
    }));
}
