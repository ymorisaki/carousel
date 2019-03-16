export function initFunction() {
    'use strict';

    var docElement = document.documentElement;

    if (docElement && 1 === docElement.nodeType) {
        docElement.setAttribute('data-script-enabled', 'true');
    }

    docElement = null;
}