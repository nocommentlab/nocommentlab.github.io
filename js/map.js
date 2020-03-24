// for quick switching of glow
let enableGlow = true;
let bend = 0.5;
let showLabel = true;

// path for arrow icon
let arrowSvg = "M-2,4.5 L0,0 L2,4.5 Z";

// get the current container height
let element = document.getElementById('container'),
  width = element.offsetWidth,
  height = element.offsetHeight,
  maxScale = 10,
  currentScale = 1,
  center = [0, 40],
  activeNode = d3.select(null),
  scrolled = false,
  path, projection, d3Zoom,
  selectedFill = 'rgba(255,255,255, 0.2)',
  arcSetup = {
    inbound: {
      level_1: {
        strokeColor: 'rgb(78, 249, 81)',
        strokeWidth: .2
      },
      level_2: {
        strokeColor: 'rgb(78, 249, 81)',
        strokeWidth: 0.4
      },
      level_3: {
        strokeColor: 'rgb(78, 249, 81)',
        strokeWidth: 0.6
      },
      level_4: {
        strokeColor: 'rgb(78, 249, 81)',
        strokeWidth: 0.8
      },
      level_5: {
        strokeColor: 'rgb(78, 249, 81)',
        strokeWidth: 1
      },
      level_6: {
        strokeColor: 'rgb(78, 249, 81)',
        strokeWidth: 1.2
      }
    },
    outbound: {
      level_1: {
        strokeColor: 'rgb(255, 82, 82)',
        strokeWidth: 0.2
      },
      level_2: {
        strokeColor: 'rgb(255, 82, 82)',
        strokeWidth: 0.4
      },
      level_3: {
        strokeColor: 'rgb(255, 82, 82)',
        strokeWidth: 0.6
      },
      level_4: {
        strokeColor: 'rgb(255, 82, 82)',
        strokeWidth: 0.8
      },
      level_5: {
        strokeColor: 'rgb(255, 82, 82)',
        strokeWidth: 1
      },
      level_6: {
        strokeColor: 'rgb(255, 82, 82)',
        strokeWidth: 1.2
      }
    }
  },
  arcData=[];

const getBound = (translate, scale) => {
  translate[0] = Math.min(
    (width / height) * (scale - 1),
    Math.max(width * (1 - scale), translate[0])
  );

  translate[1] = Math.min(0, Math.max(height * (1 - scale), translate[1]));

  return { translate: translate, scale: scale };
};

const scalePopup = (translate, scale) => {
  // scale the popup
  const popupCard = d3.select('.card-popup'),
    container = d3.select('#container'),
    containerSize = [
      container.node().offsetWidth,
      container.node().offsetHeight
    ],
    popSize = [
      popupCard.node().offsetWidth,
      popupCard.node().offsetHeight
    ];

  let originalPointX = !popupCard.empty() && popupCard.attr('data-left'),
    originalPointY = !popupCard.empty() && popupCard.attr('data-top'),
    currentLeft = !popupCard.empty() && popupCard.style('left').replace('px', ''),
    currentTop = !popupCard.empty() && popupCard.style('top').replace('px', ''),
    newLeft = currentLeft !== 'auto' ? (originalPointX * scale) - Math.abs(translate[0]) : currentLeft,
    newTop = currentTop !== 'auto' ? (originalPointY * scale) - Math.abs(translate[1]) + 10 : currentTop;

  if (popSize[0] + newLeft > containerSize[0]) {
    popupCard.style('left', 'auto');
    popupCard.style('right', 0);
  } else {
    popupCard.style('left', newLeft + 'px');
    popupCard.style('right', 'auto');
  }

  if (popSize[1] + newTop > containerSize[1]) {
    popupCard.style('top', 'auto');
    popupCard.style('bottom', 0);
  } else {
    popupCard.style('top', newTop + 'px');
    popupCard.style('bottom', 'auto');
  }
}

const zoomed = (datamap) => {
  const currentTranslate = d3Zoom.translate(),
    currentScale = d3Zoom.scale(),
    limitBound = getBound(currentTranslate, currentScale);

  // maintain the node stroke-width to the current scale
  datamap.svg.selectAll('g')
    .style("stroke-width", 1.5 / limitBound.scale + "px");

  // scale the size of arrow
  datamap.svg.selectAll('.arch-arrow')
    .attr('transform', function (d) {
      // we need to preserve the transform value and append the new scale
      let transform = d3.transform(d3.select(this).attr('transform')),
        translate = transform.translate,
        rotate = transform.rotate,
        scale = currentScale > 1 ? (1 - (currentScale / 12) < 0.4 ? 0.4 : 1 - (currentScale / 12)) : 1;

      return 'translate(' + translate + ')scale(' + scale + ')rotate(' + rotate + ')';
    });

  // translate all the node according the current scale and translate
  datamap.svg.selectAll('g')
    .attr("transform", "translate(" + limitBound.translate + ")scale(" + limitBound.scale + ")");

  // scale label text
  datamap.svg.selectAll('text')
    .style('font-size', 12 / limitBound.scale + 'px');

  // reposition popupCard
  scalePopup(limitBound.translate, limitBound.scale);
};

const zoomInBound = (datamap, geography, node) => {
  if (geography) {
    // if the selected node are already active, zoom it out
    if (activeNode.node() === node) {
      return;
    }

    // remove active class from currently selected node
    activeNode.classed('active', false);

    // mark this node as the new selection
    activeNode = d3.select(node).classed('active', true);

    // get the node bounds and calculate the translate and scale appropriately
    let bounds = path.bounds(geography),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y],
      bound = getBound(translate, scale);

    interpolate(datamap, bound.translate, bound.scale);
  }
};

const zoomControl = (datamap, type) => {
  if (type === 'reset') {
    activeNode.classed("active", false);
    activeNode = d3.select(null);

    interpolate(datamap, [0, 0], 1);
  } else {
    let direction = 1,
      factor = 0.2,
      target_zoom = 1,
      center = [width / 2, height / 2],
      extent = d3Zoom.scaleExtent(),
      translate = d3Zoom.translate(),
      translate0 = [],
      l = [],
      view = {
        x: translate[0],
        y: translate[1],
        k: d3Zoom.scale()
      },
      bound;

    direction = (type === 'in') ? 1 : -1;
    target_zoom = d3Zoom.scale() * (1 + factor * direction);

    if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
    view.k = target_zoom;
    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

    view.x += center[0] - l[0];
    view.y += center[1] - l[1];

    bound = getBound([view.x, view.y], view.k);

    interpolate(datamap, bound.translate, bound.scale);
  }
};

const interpolate = (datamap, translate, scale) => {
  return d3.transition().duration(750).tween("zoom", function () {
    let it = d3.interpolate(d3Zoom.translate(), translate),
      is = d3.interpolate(d3Zoom.scale(), scale);

    return function (t) {
      d3Zoom
        .scale(is(t))
        .translate(it(t));

      zoomed(datamap);
    };
  });
};

// function to get the path point at the given length
// and return the translate and rotation position for the arrows
const translateAlong = (path, direction) => {
  let l = path.getTotalLength();
  return function (d, i, a) {
    return function (t) {
      let atLength = direction === 1 ? (t * l) : (l - (t * l)),
        p1 = path.getPointAtLength(atLength),
        p2 = path.getPointAtLength((atLength) + direction),
        angle = 0,
        rot_tran, p;

      // when it reached the end of the path, we need to get the point at the end of the path and a point before, else we would -90 degree since the point are the same
      if (p2.y === p1.y && p2.x === p1.x) {
        p1 = path.getPointAtLength(l - 1);
        p2 = path.getPointAtLength(l);
      }

      angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) - 90;

      rot_tran = "rotate(" + angle + ")";
      p = path.getPointAtLength(t * l);

      return "translate(" + p.x + "," + p.y + ") " + rot_tran;
    };
  };
};

const lngLatToArc = (source, target, sharpness) => {
  // If no bend is supplied, then do the plain square root
  sharpness = sharpness || 1;

  if (source && target) {
    const sourceXY = projection(source),
      targetXY = projection(target);

    const sourceX = sourceXY[0],
      sourceY = sourceXY[1];

    const targetX = targetXY[0],
      targetY = targetXY[1];

    const dx = targetX - sourceX,
      dy = targetY - sourceY,
      midXY = [(sourceX + targetX) / 2, (sourceY + targetY) / 2];

    return "M" + sourceX + ',' + sourceY + "S" + (midXY[0] + (50 * sharpness)) + "," + (midXY[1] - (75 * sharpness)) + "," + targetX + "," + targetY;
  } else {
    return "M0,0,l0,0z";
  }
};

const arcPopup = (data, position) => {
  // append the data
  const popup = d3.selectAll('.card-popup'),
    currentTranslate = d3Zoom.translate(),
    currentScale = d3Zoom.scale(),
    bound = getBound(currentTranslate, currentScale),
    container = d3.select('#container');

  let className = popup.attr('class');

  // hide the previous popup
  if (className.indexOf('visible') > -1) {
    // clear its content
    popup.select('.popup-content').html('');

    // remove the visible class
    popup.attr('class', className.replace('visible', ''));

    // update the class name
    className = popup.attr('class');
  }

  // add the close button
  if (popup.selectAll('.popup__close-btn').empty()) {
    popup.append('a')
      .attr('class', 'popup__close-btn cursor')
      .append('span')
      .html('&times;');
  }

  // append content
  if (popup.selectAll('.popup-content').empty()) {
    popup.append('div')
      .attr('class', 'popup-content');
  }

  popup.selectAll('.popup-content')
    .append('h3')
    .attr('class', 'title')
    .html('Source:' + data.origin.title);

  popup.selectAll('.popup-content')
    .append('h3')
    .attr('class', 'title')
    .html('Target:' + data.destination.title);

  // set the positioning of the pop and make it visible
  popup
    .attr('class', className + ' visible')
    .attr('data-left', position[0])
    .attr('data-top', position[1]);

  // scale and position the popup
  scalePopup(bound.translate, bound.scale);
};

const createGlows = (map) => {
  const defs = map.svg.append('defs');
  const filter = defs.append('filter').attr('id', 'glow');

  filter.append('feGaussianBlur')
    .attr('class', 'blur')
    .attr('stdDeviation', '2.5')
    .attr('result', 'coloredBlur');

  const feMerge = filter.append('feMerge');

  feMerge.append('feMergeNode')
    .attr('in', 'coloredBlur');
  feMerge.append('feMergeNode')
    .attr('in', 'SourceGraphic');
};

// let's do the arch and arrows
const mapLines = (map, data) => {
  // create the line
  let direction = 1;

  map.svg.selectAll('.arch-container')
    .append('svg:path')
    .style('stroke-linecap', 'round')
    .attr('class', 'datamaps-arc cursor')
    .attr('stroke', () => {
      return data.options.strokeColor
    })
    .attr('stroke-width', () => {
      return data.options.strokeWidth
    })
    .attr('fill', 'none')
    .on('click', function (event) {
      arcPopup(data, d3.mouse(this))
    })
    .attr('d', () => {
      return lngLatToArc(data.origin.coordinates, data.destination.coordinates, bend);
    })
    .transition()
    .delay(100)
    .style('fill', function () {
      var length = this.getTotalLength();
      this.style.transition = this.style.WebkitTransition = 'none';
      this.style.strokeDasharray = length + ' ' + length;
      this.style.strokeDashoffset = length;
      this.getBoundingClientRect();
      this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset 1000ms ease-out';
      this.style.strokeDashoffset = '0';

      if (data.destination[0] - data.origin[0] < 0) direction = -1;

      // animate arrow
      map.svg.selectAll('.arch-container')
        .append('svg:path')
        .attr('class', 'arch-arrow')
        .attr('d', d3.svg.symbol().type('triangle-down').size(12))
        .attr('stroke-width', 0)
        .attr('stroke-opacity', 0)
        .attr('fill', () => data.options.strokeColor)
        .transition()
        .delay(0)
        .duration(750)
        .ease('linear')
        .attrTween('transform', translateAlong(this, direction));
      return 'none';
    });

  enableGlow &&
    map.svg.selectAll('.datamaps-arc').style('filter', 'url(#glow)');
}

const createMarkerLabel = (map, data) => {
  const limitBound = getBound(d3Zoom.translate(), d3Zoom.scale());

  map.svg.selectAll('.bubbles')
    .selectAll('text')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'marker-label')
    .attr('x', function (d) {
      return projection(d.coordinates)[0];
    })
    .attr('y', function (d) {
      return projection(d.coordinates)[1] + 15;
    })
    .attr('fill', 'rgba(255,255,255, 0.75)')
    .style('font-size', 12 / limitBound.scale + 'px')
    .text(function (d) {
      return d.name;
    });
};

const clearLinesMarkersArrows = (map) => {
  map.bubbles([]);
  map.svg.selectAll('.datamaps-arc').remove();
  map.svg.selectAll('.arch-arrow').remove();
  map.svg.selectAll('.marker-label').remove();
};

const drawAttack = (map) => {
  let tempMarkers = [],
    tempLabels = [],
    count = 0;

  enableGlow && createGlows(map);

  // clear any existing lines and arrows
  clearLinesMarkersArrows(map);

  // wrap in a timeout to delay the start of the projection
  setTimeout(() => {
    for (let i = 0; i < arcData.length; i++) {
      if (!map.svg.selectAll('.arch-container')[0].length) {
        map.svg.append('g')
          .attr('class', 'arch-container');
      }

      setTimeout(() => {
        mapLines(map, arcData[i]);

        const originMarker = {
          name: arcData[i].origin.name,
          radius: arcData[i].origin.radius,
          longitude: arcData[i].origin.coordinates[0],
          latitude: arcData[i].origin.coordinates[1],
          fillKey: arcData[i].origin.fillKey,
        };

        const destinationMarker = {
          name: arcData[i].destination.name,
          radius: arcData[i].destination.radius,
          longitude: arcData[i].destination.coordinates[0],
          latitude: arcData[i].destination.coordinates[1],
          fillKey: arcData[i].destination.fillKey,
        };

        tempMarkers.push(originMarker);
        tempMarkers.push(destinationMarker);

        map.bubbles(tempMarkers);

        count++;

        // when all of the data is mapped...
        if (count === arcData.length) {

          // pause for 10 seconds before triggering this function again
          setTimeout(() => {
            drawAttack(map);
          }, 2000);
        }

        if (showLabel) {
          // find if the location already exists in labels
          const labelOriginExists = tempLabels.find(label => label.name === arcData[i].origin.name && label.coordinates[0] === arcData[i].origin.coordinates[0] && label.coordinates[1] === arcData[i].origin.coordinates[1]);

          const labelDestinationExists = tempLabels.find(label => label.name === arcData[i].destination.name && label.coordinates[0] === arcData[i].destination.coordinates[0] && label.coordinates[1] === arcData[i].destination.coordinates[1]);

          if (!labelOriginExists) {
            // put label to the markers
            tempLabels.push(arcData[i].origin);
          }

          if (!labelDestinationExists) {
            tempLabels.push(arcData[i].destination);
          }

          createMarkerLabel(map, tempLabels);
        }
      }, i * 1500);
    }
  }, 1000);
};

const mapReady = (datamap) => {
  const paths = datamap.svg.selectAll('path');

  paths.style('vector-effect', 'non-scaling-stroke');

  // create the card popup for the arc
  d3.selectAll('#container')
    .append('div')
    .attr('class', 'card-popup');

  // bind on country zoom
  datamap.svg.selectAll('.datamaps-subunit').on('click', function (d) { zoomInBound(datamap, d, this); });

  // bind zoom control
  d3.selectAll('.map-control').on('click', function () {
    var currentItem = d3.event.target;

    if (currentItem.className.indexOf('map-control') === -1) {
      // take the parent
      currentItem = currentItem.parentNode;
    }

    zoomControl(datamap, currentItem.dataset.zoom);
  });

  // initialize the d3 zoom and call the zoomed function
  d3Zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(currentScale)
    .scaleExtent([1, maxScale])
    .on('zoom', () => zoomed(datamap));

  datamap.svg.call(d3Zoom).call(d3Zoom.event);

  // initialize the attack line
  drawAttack(datamap);
};

let map = new Datamap({
  scope: 'world',
  element: document.getElementById('container'),
  projection: 'winkel3',
  setProjection: function (element) {
    projection = d3.geo.mercator()
      .center([0, 40])
      .scale(50)
      .translate([width / 2, height / 2]);
    path = d3.geo.path()
      .pointRadius(2)
      .projection(projection);

    return { path: path, projection: projection };
  },
  height: height,
  fills: {
    defaultFill: '#000',
    markers: 'transparent'
  },
  geographyConfig: {
    dataUrl: null,
    hideAntarctica: true,
    hideHawaiiAndAlaska: true,
    borderWidth: 0.75,
    borderOpacity: 1,
    borderColor: '#4393c3',
    highlightOnHover: false,
    highlightFillColor: 'black',
    highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
    highlightBorderWidth: 2,
    highlightBorderOpacity: 1
  },
  bubblesConfig: {
    borderWidth: 1,
    borderColor: '#fefefe',
    popupOnHover: true,
    highlightFillColor: '#000',
    radius: 2
  },
  done: (datamap) => mapReady(datamap)
});