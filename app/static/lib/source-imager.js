// Handles display of sources score images as referenced through zone and surface elements.

var facs = {}; // facsimile structure in MEI file
var sourceImages = {}; // object of source images
let rectangleLineWidth = 6; // width of bounding box rectangles in px
let rectangleColor = 'darkred';
let listenerHandles = {};

import {
    rmHash
} from './utils.js';
import {
    svgNS,
    xmlNameSpace
} from './dom-utils.js'
import {
    transformCTM,
    updateRect
} from './drag-selector.js';
import {
    cm,
    v
} from './main.js';
import {
    replaceInTextEditor
} from './editor.js';



// loads facsimile content of xmlDoc into an object
export function loadFacsimile(xmlDoc) {
    facs = {};
    sourceImages = {};
    let facsimile = xmlDoc.querySelector('facsimile');
    if (facsimile) {
        let zones = facsimile.querySelectorAll('zone');
        zones.forEach(z => {
            let id, ulx, uly, lrx, lry;
            if (z.hasAttribute('xml:id')) id = z.getAttribute('xml:id');
            if (z.hasAttribute('ulx')) ulx = z.getAttribute('ulx');
            if (z.hasAttribute('uly')) uly = z.getAttribute('uly');
            if (z.hasAttribute('lrx')) lrx = z.getAttribute('lrx');
            if (z.hasAttribute('lry')) lry = z.getAttribute('lry');
            let graphic = z.parentElement.querySelector('graphic');
            if (graphic) {
                let target, width, height;
                if (graphic.hasAttribute('target')) target = graphic.getAttribute('target');
                if (graphic.hasAttribute('width')) width = graphic.getAttribute('width');
                if (graphic.hasAttribute('height')) height = graphic.getAttribute('height');
                if (id) {
                    facs[id] = {};
                    if (target) facs[id]['target'] = target;
                    if (width) facs[id]['width'] = width;
                    if (height) facs[id]['height'] = height;
                    if (ulx) facs[id]['ulx'] = ulx;
                    if (uly) facs[id]['uly'] = uly;
                    if (lrx) facs[id]['lrx'] = lrx;
                    if (lry) facs[id]['lry'] = lry;
                    let measure = xmlDoc.querySelector('[facs="#' + id + '"]');
                    if (measure) {
                        if (measure.hasAttribute('xml:id')) facs[id]['measureId'] = measure.getAttribute('xml:id');
                        if (measure.hasAttribute('n')) facs[id]['measureN'] = measure.getAttribute('n');
                    }
                }
            }
        });
    }
    return facs;
}


// Draw the source image with bounding boxes for each zone
export async function drawSourceImage() {
    let fullPage = document.getElementById('showSourceImageFullPage').checked;
    let ulx = Number.MAX_VALUE; // boundary values for image envelope
    let uly = Number.MAX_VALUE;
    let lrx = 0;
    let lry = 0;
    let zoneId;
    let svgFacs = document.querySelectorAll('[data-facs]'); // list displayed zones
    if (svgFacs && fullPage) {
        let firstZone = svgFacs.item(0);
        if (firstZone.hasAttribute('data-facs'))
            zoneId = rmHash(firstZone.getAttribute('data-facs'));
    } else {
        svgFacs.forEach((f) => { // go through displayed zones and find envelope
            if (f.hasAttribute('data-facs'))
                zoneId = rmHash(f.getAttribute('data-facs'));
            if (facs[zoneId]) {
                if (parseFloat(facs[zoneId].ulx) < ulx) ulx = parseFloat(facs[zoneId].ulx) - rectangleLineWidth / 2;
                if (parseFloat(facs[zoneId].uly) < uly) uly = parseFloat(facs[zoneId].uly) - rectangleLineWidth / 2;
                if (parseFloat(facs[zoneId].lrx) > lrx) lrx = parseFloat(facs[zoneId].lrx) + rectangleLineWidth / 2;
                if (parseFloat(facs[zoneId].lry) > lry) lry = parseFloat(facs[zoneId].lry) + rectangleLineWidth / 2;
            }
        });
    }
    let svgContainer = document.getElementById('source-image-container');
    let svg = document.getElementById('source-image-svg');
    if (svg) svg.innerHTML = '';
    if (facs[zoneId]) {
        let imgName = `${root}local/` + facs[zoneId].target;
        imgName = imgName.replace('.tif', '.jpg'); // hack for some DIME files...
        if (false) {
            let xfact = .33;
            let yfact = .67;
            ulx *= xfact;
            uly *= yfact;
            lrx *= xfact;
            lry *= yfact;
        }
        let img;
        if (!sourceImages.hasOwnProperty(imgName)) {
            img = document.createElementNS(svgNS, 'image');
            img.setAttribute('id', 'source-image');
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgName);
            sourceImages[imgName] = img;
        } else {
            img = sourceImages[imgName]
        }
        svg.appendChild(img);

        if (fullPage) {
            let bb = img.getBBox();
            ulx = 0;
            uly = 0;
            lrx = bb.width;
            lry = bb.height;
        }
        let width = lrx - ulx;
        let height = lry - uly;
        // svgContainer.setAttribute("transform", "translate(" + (ulx / 2) + " " + (uly / 2 ) + ") scale(" + zoomFactor + ")");
        let zoomFactor = document.getElementById('sourceImageZoom').value / 100;
        svgContainer.setAttribute("transform", "scale(" + zoomFactor + ")");
        svgContainer.setAttribute('width', width);
        svgContainer.setAttribute('height', height);
        // svgContainer.appendChild(document.createAttributeNS(svgNS, 'circle'))
        svg.setAttribute('viewBox', ulx + ' ' + uly + ' ' + width + ' ' + height);

        if (false) { // show page name on svg
            let lbl = document.getElementById('source-image-svg-label');
            if (!lbl) {
                lbl = document.createElementNS(svgNS, 'text');
                lbl.setAttribute('id', 'source-image-svg-label')
            }
            lbl.textContent = imgName.split('\\').pop().split('/').pop();
            lbl.setAttribute('font-size', '28px');
            lbl.setAttribute('font-weight', 'bold');
            lbl.setAttribute('x', ulx + 7);
            lbl.setAttribute('y', uly + 29);
            svg.appendChild(lbl);
        }
        // go through displayed zones and draw bounding boxes with number-like label
        if (fullPage) {
            for (let z in facs) {
                if (facs[z]['target'] === facs[zoneId]['target'])
                    drawBoundingBox(z, facs[z]['measureId'], facs[z]['measureN']);
            }
        } else {
            svgFacs.forEach(m => {
                if (m.hasAttribute('data-facs')) zoneId = rmHash(m.getAttribute('data-facs'));
                drawBoundingBox(zoneId, facs[zoneId]['measureId'], facs[zoneId]['measureN'])
            });
        }
        // console.log('ulx/uly//lrx/lry;w/h: ' + ulx + '/' + uly + '; ' + lrx + '/' + lry + '; ' + width + '/' + height);
    }
}

function drawBoundingBox(zoneId, measureId, measureN) {
    if (facs[zoneId]) {
        let rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('rx', rectangleLineWidth / 2);
        rect.setAttribute('ry', rectangleLineWidth / 2);
        let editZones = document.getElementById('editZones').checked;
        let svg = document.getElementById('source-image-svg');
        svg.appendChild(rect);
        let x = parseFloat(facs[zoneId].ulx);
        let y = parseFloat(facs[zoneId].uly);
        let width = parseFloat(facs[zoneId].lrx) - x;
        let height = parseFloat(facs[zoneId].lry) - y;
        updateRect(rect, x, y, width, height, rectangleColor, rectangleLineWidth, 'none');
        if (measureId) rect.id = editZones ? zoneId : measureId;
        if (measureN) { // draw number-like info from measure
            let txt = document.createElementNS(svgNS, 'text');
            svg.appendChild(txt);
            txt.setAttribute('font-size', '28px');
            txt.setAttribute('font-weight', 'bold');
            txt.setAttribute('fill', rectangleColor);
            txt.setAttribute('x', x + 7);
            txt.setAttribute('y', y + 29);
            txt.textContent = measureN;
            if (measureId) txt.id = editZones ? zoneId : measureId;
        }
    }
}

async function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
    });
}

export function zoomSourceImage(percent) {
    let sourceImageZoom = document.getElementById('sourceImageZoom');
    if (sourceImageZoom && percent)
        sourceImageZoom.value = Math.min(parseInt(sourceImageZoom.max),
            Math.max(parseInt(sourceImageZoom.min), parseInt(sourceImageZoom.value) + percent));
    let svgContainer = document.getElementById('source-image-container');
    svgContainer.setAttribute("transform", "scale(" + sourceImageZoom.value / 100 + ")");
}

export function highlightZone(rect) {
    let svg = document.getElementById('source-image-svg');
    // remove event listerners
    for (let key in listenerHandles) {
        svg.querySelectorAll('rect').forEach(r => r.removeEventListener(key, listenerHandles[key]));
    }
    // add zone resizer for selected zone box (only when linked to zone rather than to measure)
    if (document.getElementById('editZones').checked)
        listenerHandles = addZoneResizer(v, rect);
}

// event listeners for resizing a zone bounding box
export function addZoneResizer(v, rect) {
    let txt = document.querySelector('text[id="' + rect.id + '"]');
    let txtX, txtY;
    if (txt) {
        txtX = parseFloat(txt.getAttribute('x'));
        txtY = parseFloat(txt.getAttribute('y'));
    }
    let ip = document.getElementById('image-panel');
    let svg = document.getElementById('source-image-svg');
    var start = {}; // starting point start.x, start.y
    var end = {}; // ending point
    var what = ''; // west, east, north, south side
    let bb;

    function mouseDown(ev) {
        let bcr = rect.getBoundingClientRect();
        bb = rect.getBBox();
        start.x = ev.clientX + ip.scrollLeft;
        start.y = ev.clientY + ip.scrollTop;
        let thres = rectangleLineWidth * 2;
        let xl = Math.abs(ev.clientX - bcr.x);
        let xr = Math.abs(ev.clientX - bcr.x - bcr.width);
        let yu = Math.abs(ev.clientY - bcr.y);
        let yl = Math.abs(ev.clientY - bcr.y - bcr.height);
        if (xl < thres) what = 'west';
        if (yu < thres) what = 'north';
        if (xr < thres) what = 'east';
        if (yl < thres) what = 'south';
        if (xl < thres && yu < thres) what = 'northwest';
        if (xr < thres && yu < thres) what = 'northeast';
        if (xl < thres && yl < thres) what = 'southwest';
        if (xr < thres && yl < thres) what = 'southeast';
        // console.log('Mouse down: ev.clientX/Y:' + ev.clientX + '/' + ev.clientX + ': ' + what + ', rect:', rect);
    };

    function mouseMove(ev) {
        let bcr = rect.getBoundingClientRect();
        let thres = rectangleLineWidth * 2;
        let xl = Math.abs(ev.clientX - bcr.x);
        let xr = Math.abs(ev.clientX - bcr.x - bcr.width);
        let yu = Math.abs(ev.clientY - bcr.y);
        let yl = Math.abs(ev.clientY - bcr.y - bcr.height);
        rect.style.cursor = 'default';
        if (xl < thres) rect.style.cursor = 'ew-resize';
        if (yu < thres) rect.style.cursor = 'ns-resize';
        if (xr < thres) rect.style.cursor = 'ew-resize';
        if (yl < thres) rect.style.cursor = 'ns-resize';
        if (xl < thres && yu < thres) rect.style.cursor = 'nwse-resize';
        if (xr < thres && yu < thres) rect.style.cursor = 'nesw-resize';
        if (xl < thres && yl < thres) rect.style.cursor = 'nesw-resize';
        if (xr < thres && yl < thres) rect.style.cursor = 'nwse-resize';

        if (what) {
            let thisStart = {}; // adjust starting point to scroll of verovio-panel
            thisStart.x = start.x - ip.scrollLeft;
            thisStart.y = start.y - ip.scrollTop;
            end.x = ev.clientX;
            end.y = ev.clientY;

            var mx = svg.getScreenCTM().inverse();
            let s = transformCTM(thisStart, mx);
            let e = transformCTM(end, mx);
            let dx = e.x - s.x;
            let dy = e.y - s.y;

            let x, y, width, height;
            switch (what) {
                case 'west':
                    x = bb.x + dx, y = bb.y, width = bb.width - dx, height = bb.height;
                    break;
                case 'east':
                    x = bb.x, y = bb.y, width = bb.width + dx, height = bb.height;
                    break;
                case 'north':
                    x = bb.x, y = bb.y + dy, width = bb.width, height = bb.height - dy;
                    break;
                case 'south':
                    x = bb.x, y = bb.y, width = bb.width, height = bb.height + dy;
                    break;
                case 'northwest':
                    x = bb.x + dx, y = bb.y + dy, width = bb.width - dx, height = bb.height - dy;
                    break;
                case 'northeast':
                    x = bb.x, y = bb.y + dy, width = bb.width + dx, height = bb.height - dy;
                    break;
                case 'southwest':
                    x = bb.x + dx, y = bb.y, width = bb.width - dx, height = bb.height + dy;
                    break;
                case 'southeast':
                    x = bb.x, y = bb.y, width = bb.width + dx, height = bb.height + dy;
                    break;
            }
            x = Math.round(x), y = Math.round(y), width = Math.round(width), height = Math.round(height);
            updateRect(rect, x, y, width, height, rectangleColor, rectangleLineWidth, 'none');
            if (txt && what === 'northwest' || what === 'west') txt.setAttribute('x', txtX + dx);
            if (txt && what === 'north' || what === 'northwest') txt.setAttribute('y', txtY + dy);

            let zone = v.xmlDoc.querySelector('[*|id=' + rect.id + ']');
            zone.setAttribute('ulx', x);
            zone.setAttribute('uly', y);
            zone.setAttribute('lrx', x + width);
            zone.setAttribute('lry', y + height);
            // edit in CodeMirror
            v.updateNotation = false;
            replaceInTextEditor(cm, zone, true);
            v.updateNotation = true;
            // console.log('Dragging: ' + what + ' ' + dx + '/' + dy);
        }
    };

    function mouseUp(ev) {
        what = '';
        loadFacsimile(v.xmlDoc);
        // console.log('mouse up');
    };

    rect.addEventListener('mousedown', mouseDown);
    ip.addEventListener('mousemove', mouseMove);
    ip.addEventListener('mouseup', mouseUp);

    return {
        'mousedown': mouseDown,
        'mousemove': mouseMove,
        'mouseup': mouseUp
    };

} // addZoneResizer()

// enables zone drawing with mouse click-and-drag
export function addZoneDrawer() {
    let ip = document.getElementById('image-panel');
    let svg = document.getElementById('source-image-svg');
    var start = {}; // starting point start.x, start.y
    var end = {}; // ending point
    let what = '';

    function mouseDown(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        start.x = ev.clientX; // + ip.scrollLeft;
        start.y = ev.clientY; // + ip.scrollTop;
        if (document.getElementById('editZones').checked) {
            let rect = document.createElementNS(svgNS, 'rect');
            rect.id = 'new-rect';
            rect.setAttribute('rx', rectangleLineWidth / 2);
            rect.setAttribute('ry', rectangleLineWidth / 2);
            rect.setAttribute('x', start.x);
            rect.setAttribute('y', start.y);
            rect.setAttribute('stroke', rectangleColor);
            rect.setAttribute('stroke-width', rectangleLineWidth);
            rect.setAttribute('fill', 'none');
            svg.appendChild(rect);
            what = 'new';
        }
    }

    function mouseMove(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (document.getElementById('editZones').checked && what === 'new') {
            let rect = document.getElementById('new-rect');
            if (rect) {
                let thisStart = {}; // adjust starting point to scroll of verovio-panel
                thisStart.x = start.x; // - ip.scrollLeft;
                thisStart.y = start.y; // - ip.scrollTop;
                end.x = ev.clientX;
                end.y = ev.clientY;

                var mx = svg.getScreenCTM().inverse();
                let s = transformCTM(thisStart, mx);
                let e = transformCTM(end, mx);
                let width = e.x - s.x;
                let height = e.y - s.y;
                // let width = end.x - thisStart.x;
                // let height = end.y - thisStart.y;

                rect.setAttribute('width', width);
                rect.setAttribute('height', height);
            }
        }
    }

    function mouseUp(ev) {
        if (document.getElementById('editZones').checked) {
            let rect = document.getElementById('new-rect');
            if (rect) {
                let zone = v.xmlDoc.createElementNS(xmlNameSpace, 'zone');
                console.log('new zone', rect);
                // TODO: add new zone to xmlDoc and to cm
                // TODO: update rect.id to new xml:id
            }
            what = '';
        }
    }

    svg.addEventListener('mousedown', mouseDown);
    svg.addEventListener('mousemove', mouseMove);
    svg.addEventListener('mouseup', mouseUp);
}