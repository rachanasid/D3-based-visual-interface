var path = '../static/data/';

function interactive_bar_pie(id){


  var div = d3.select(id);
  div.selectAll("*").remove();


  d3.json(path+'day_of_week.json', function(error, data) {
    if (error) throw error;
    var barColor = 'steelblue';
    var color = d3.scale.category20();

    fData = [];
    // compute total for each state.
    for (var month in data) {
      var obj = {};
      obj['Month'] = month;
      obj['freq'] = data[month];
      total = 0;
      for (age_band in data[month]) {
        total += parseInt(data[month][age_band]);
      }
      obj['total'] = total;
      fData.push(obj);
    }

    function histoGram(fD){
      var hG={},    hGDim = {t: 60, r: 0, b: 50, l: 0};
      hGDim.w = 550 - hGDim.l - hGDim.r,
      hGDim.h = 340 - hGDim.t - hGDim.b;

      var hGsvg = d3.select(id).append("svg")
        .attr("width", hGDim.w + hGDim.l + hGDim.r)
        .attr("height", hGDim.h + hGDim.t + hGDim.b).append("g")
        .attr("transform", "translate(" + hGDim.l + "," + hGDim.t + ")");

      var x = d3.scale.ordinal().rangeRoundBands([0, hGDim.w], 0.1)
        .domain(fD.map(function(d) { return d[0]; }));

      hGsvg.append("g").attr("class", "x axis")
        .attr("transform", "translate(0," + hGDim.h + ")")
        .call(d3.svg.axis().scale(x).orient("bottom"));

      var y = d3.scale.linear().range([hGDim.h, 0])
        .domain([0, d3.max(fD, function(d) { return d[1]; })]);

      var bars = hGsvg.selectAll(".bar").data(fD).enter()
        .append("g").attr("class", "bar");

      bars.append("rect")
        .attr("x", function(d) { return x(d[0]); })
        .attr("y", function(d) { return y(d[1]); })
        .attr("width", x.rangeBand())
        .attr("height", function(d) { return hGDim.h - y(d[1]); })
        .attr('fill',barColor)
        .on("mouseover",mouseover)
        .on("mouseout",mouseout);

      bars.append("text").text(function(d){ return d3.format(",")(d[1])})
        .attr("x", function(d) { return x(d[0])+x.rangeBand()/2; })
        .attr("y", function(d) { return y(d[1])-5; })
        .attr("text-anchor", "middle");

      function mouseover(d){
        var st = fData.filter(function(s){ return s.Month == d[0];})[0],
            nD = d3.keys(st.freq).map(function(s){ return {type:s, freq:st.freq[s]};}),
            sorter = {"sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6};

        nD.sort(function sortByDay(a, b) {
          var day1 = a.type.toLowerCase();
          var day2 = b.type.toLowerCase();
          return sorter[day1] > sorter[day2];
        });
        pC.update(nD);
        leg.update(nD);
      }

      function mouseout(d){
        pC.update(tF);
        leg.update(tF);
      }

      hG.update = function(nD, color){
        y.domain([0, d3.max(nD, function(d) { return d[1]; })]);

        var bars = hGsvg.selectAll(".bar").data(nD);

        bars.select("rect").transition().duration(500)
          .attr("y", function(d) {return y(d[1]); })
          .attr("height", function(d) { return hGDim.h - y(d[1]); })
          .attr("fill", color);

        bars.select("text").transition().duration(500)
          .text(function(d){ return d3.format(",")(d[1])})
          .attr("y", function(d) {return y(d[1])-5; });
      }

      hGsvg.append("text")
        .attr("transform", "translate(" + (hGDim.w/2) + " ," + (hGDim.h+40) + ")")
        .style("text-anchor", "middle")
        .text('Number of accidents per month');
      return hG;
    }

    function pieChart(pD){
      var pC ={}, pieDim ={w:280, h: 250};
      pieDim.r = Math.min(pieDim.w, pieDim.h) / 2;

      var piesvg = d3.select(id).append("svg")
        .attr("width", pieDim.w).attr("height", pieDim.h).append("g")
        .attr("transform", "translate("+(pieDim.w/2)+","+pieDim.h/2+")");

      var arc = d3.svg.arc().outerRadius(pieDim.r - 10).innerRadius(0);

      var pie = d3.layout.pie().sort(null).value(function(d) { return d.freq; });

      piesvg.selectAll("path").data(pie(pD)).enter().append("path").attr("d", arc)
        .each(function(d) { this._current = d; })
        .style("fill", function(d) { return color(d.data.index); })
        .on("mouseover",mouseover).on("mouseout",mouseout);

      pC.update = function(nD){
        piesvg.selectAll("path").data(pie(nD))
          .transition()
          .duration(500)
          .attrTween("d", arcTween);
      }
      function mouseover(d){
        hG.update(fData.map(function(v){return [v.Month,v.freq[d.data.type]];}),color(d.data.index));
      }
      function mouseout(d){
        hG.update(fData.map(function(v){return [v.Month,v.total];}), barColor);
      }

      function arcTween(a) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) { return arc(i(t));  };
      }
      return pC;
    }

    function legend(lD){
      var leg = {};

      var legend = d3.select(id).append("table").attr('class','legend');

      var tr = legend.append("tbody").selectAll("tr").data(lD).enter().append("tr");

      tr.append("td").append("svg").attr("width", '16').attr("height", '16').append("rect")
        .attr("width", '16').attr("height", '16')
			  .attr("fill",function(d){ return color(d.index); });

      tr.append("td").text(function(d){ return d.type;});

      tr.append("td").attr("class",'legendFreq')
        .text(function(d){ return d3.format(",")(d.freq);});

      tr.append("td").attr("class",'legendPerc')
        .text(function(d){ return getLegend(d,lD);});

      leg.update = function(nD){
        var l = legend.select("tbody").selectAll("tr").data(nD);

        l.select(".legendFreq").text(function(d){ return d3.format(",")(d.freq);});
        l.select(".legendPerc").text(function(d){ return getLegend(d,nD);});
      }

      function getLegend(d,aD){
        return d3.format("%")(d.freq/d3.sum(aD.map(function(v){ return v.freq; })));
      }
      return leg;
    }

    var tF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(function(d, index){
        return {type:d, index: index+1 , freq: d3.sum(fData.map(function(t){ return t.freq[d];}))};
    });

    var sF = fData.map(function(d){return [d.Month,d.total];});

    var hG = histoGram(sF),
        pC = pieChart(tF),
        leg= legend(tF);
  });
}

function donut_chart(id){


  var div = d3.select(id);
  div.selectAll("*").remove();


  d3.csv(path+'do_nut_fine_slight.csv', function(error, csv_data) {
    if (error) throw error;
    var data = [];
    for(d in csv_data){
      data.push(csv_data[d]);
    }
    var width = 540,
        height = 540,
        radius = 200;

		var arc = d3.svg.arc()
    	.outerRadius(radius - 10)
    	.innerRadius(100);

		var pie = d3.layout.pie()
	    .sort(null)
	    .value(function(d) {
	      return d.close;
	    });

		var svg = d3.select(id).append("svg")
	    .attr("width", width)
	    .attr("height", height)
	    .append("g")
	    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var g = svg.selectAll(".arc")
      .data(pie(data))
      .enter().append("g");

   	g.append("path")
    	.attr("d", arc)
      .style("fill", function(d,i) {
      	return d.data.color;
      });

    g.append("text")
    	.attr("transform", function(d) {
        var _d = arc.centroid(d);
        _d[0] *= 1.5;
        _d[1] *= 1.5;
        return "translate(" + _d + ")";
      })
      .attr("dy", ".50em")
      .style("text-anchor", "middle")
      .text(function(d) {
        if(d.data.percentage < 1) {
          return '';
        }
        return d.data.accident_severity + '('+d.data.percentage + '%)';
      });
	});
}

function bar_chart_light_conditions(id){

  var div = d3.select(id);
  div.selectAll("*").remove();

  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
      return "<span style='color:#f06292'>" + d.value + "</span>";
    });

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
    .range([height, 0]);

  var xAxis = d3.svg.axis()
     .scale(x)
     .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  var chart = div.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  chart.call(tip);
  d3.csv(path+"bar_fata_impact.csv", function(error, data) {
    if (error) throw error;

    data.forEach(function(d) {
      d.value = +d.value;
    });
    x.domain(data.map(function(d) { return d.first_point_of_impact; }));
    y.domain([0, d3.max(data, function(d) { return d.value; })]);

    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    chart.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Number of Fatal Accidents");

    chart.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr('fill',"orange")
      .attr("x", function(d) { return x(d.first_point_of_impact); })
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); })
      .attr("width", x.rangeBand())
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide);
  });
}

function stacked_bar_chart(id){


  var div = d3.select(id);
  div.selectAll("*").remove();


  var causes = ["male", "female"];
  var margin = {top: 20, right: 50, bottom: 30, left: 20},
      width = 960 - margin.left - margin.right,
      height = 450 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width]);

  var y = d3.scale.linear()
    .rangeRound([height, 0]);

  var z = ["#1f77b4", "#F2635F"];

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("right")
    .tickSize(-width);

  var svg = div.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.csv(path+"stacked_bar_chart_data.csv", function(error, data) {
    if (error) throw error;

    data.forEach(function(d) {
      d.male = +d.male;
      d.female = +d.female;
    });

    var layers = d3.layout.stack()(causes.map(function(c) {
      return data.map(function(d) {
        return {x: d.age_band_of_driver, y: d[c]};
      });
    }));

    for(index in layers[1]){
      layers[1][index].y0=0;
    }
    x.domain(layers[0].map(function(d) { return d.x; }));
    y.domain([0, d3.max(layers[0], function(d) { return d.y; })]).nice();

    var layer = svg.selectAll(".layer")
      .data(layers)
      .enter().append("g")
      .attr("class", "layer")
      .style("fill", function(d, i) { return z[i]; })
      .style("opacity", .8);

    layer.selectAll("rect")
      .data(function(d) { return d; })
      .enter().append("rect")
      .attr("x", function(d) { return x(d.x); })
      .attr("y", function(d) { return y(d.y + d.y0); })
      .attr("height", function(d) { return y(d.y0) - y(d.y + d.y0); })
      .attr("width", x.rangeBand() - 1);

    svg.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", "translate(" + width + ",0)")
      .call(yAxis)
      .selectAll("g")
      .classed("zero", true);
  });
}

function treemap(id) {
    var div = d3.select(id);
    div.selectAll("*").remove();


    window.addEventListener('message', function(e) {
        var opts = e.data.opts,
            data = e.data.data;

        return main(opts, data);
    });

    var defaults = {
        margin: {top: 24, right: 0, bottom: 0, left: 0},
        rootname: "TOP",
        format: ",d",
        title: "",
        width: 960,
        height: 500
    };

    function main(o, data) {
      var root,
          opts = $.extend(true, {}, defaults, o),
          formatNumber = d3.format(opts.format),
          rname = opts.rootname,
          margin = opts.margin,
          theight = 36 + 16;

      $('#chart').width(opts.width).height(opts.height);
      var width = opts.width - margin.left - margin.right,
          height = opts.height - margin.top - margin.bottom - theight,
          transitioning;

      var color = d3.scale.category20c();

      var x = d3.scale.linear()
          .domain([0, width])
          .range([0, width]);

      var y = d3.scale.linear()
          .domain([0, height])
          .range([0, height]);

      var treemap = d3.layout.treemap()
          .children(function(d, depth) { return depth ? null : d._children; })
          .sort(function(a, b) { return a.value - b.value; })
          .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
          .round(false);

      var svg = d3.select("#chart").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.bottom + margin.top)
          .style("margin-left", -margin.left + "px")
          .style("margin.right", -margin.right + "px")
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
          .style("shape-rendering", "crispEdges");

      var grandparent = svg.append("g")
          .attr("class", "grandparent");

      grandparent.append("rect")
          .attr("y", -margin.top)
          .attr("width", width)
          .attr("height", margin.top)
          .style("fill", function(d) { return 'cadetblue'; });

      grandparent.append("text")
          .attr("x", 6)
          .attr("y", 6 - margin.top)
          .attr("dy", ".75em");

      if (opts.title) {
        $("#chart").prepend("<p class='title'>" + opts.title + "</p>");
      }
      if (data instanceof Array) {
        root = { key: rname, values: data };
      } else {
        root = data;
      }

      initialize(root);
      accumulate(root);
      layout(root);
      console.log(root);
      display(root);

      if (window.parent !== window) {
        var myheight = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.parent.postMessage({height: myheight}, '*');
      }

      function initialize(root) {
        root.x = root.y = 0;
        root.dx = width;
        root.dy = height;
        root.depth = 0;
      }

      // Aggregate the values for internal nodes. This is normally done by the
      // treemap layout, but not here because of our custom implementation.
      // We also take a snapshot of the original children (_children) to avoid
      // the children being overwritten when when layout is computed.
      function accumulate(d) {
        return (d._children = d.values)
            ? d.value = d.values.reduce(function(p, v) { return p + accumulate(v); }, 0)
            : d.value;
      }

      // Compute the treemap layout recursively such that each group of siblings
      // uses the same size (1×1) rather than the dimensions of the parent cell.
      // This optimizes the layout for the current zoom state. Note that a wrapper
      // object is created for the parent node for each group of siblings so that
      // the parent’s dimensions are not discarded as we recurse. Since each group
      // of sibling was laid out in 1×1, we must rescale to fit using absolute
      // coordinates. This lets us use a viewport to zoom.
      function layout(d) {
        if (d._children) {
          treemap.nodes({_children: d._children});
          d._children.forEach(function(c) {
            c.x = d.x + c.x * d.dx;
            c.y = d.y + c.y * d.dy;
            c.dx *= d.dx;
            c.dy *= d.dy;
            c.parent = d;
            layout(c);
          });
        }
      }

      function display(d) {
        grandparent
            .datum(d.parent)
            .on("click", transition)
          .select("text")
            .text(name(d));

        var g1 = svg.insert("g", ".grandparent")
            .datum(d)
            .attr("class", "depth");

        var g = g1.selectAll("g")
            .data(d._children)
          .enter().append("g");

        g.filter(function(d) { return d._children; })
            .classed("children", true)
            .on("click", transition);

        var children = g.selectAll(".child")
            .data(function(d) { return d._children || [d]; })
          .enter().append("g");

        children.append("rect")
            .attr("class", "child")
            .call(rect)
          .append("title")
            .text(function(d) {
                if (d.key === 'UK') {
                    return d.subregion + " (" + formatNumber(d.value) + ")"; ;
                } else {
                    return d.key + " (" + formatNumber(d.value) + ")"; ;
                }
            });
        children.append("text")
            .attr("class", "ctext")
            .text(function(d) {
                if (d.key === 'UK') {
                    return d.subregion;
                } else {
                    return d.key;
                }
            })
            .call(text2);

        g.append("rect")
            .attr("class", "parent")
            .call(rect);

        var t = g.append("text")
            .attr("class", "ptext")
            .attr("dy", ".75em")

        t.append("tspan")
            .text(function(d) {
                if (d.key === 'UK') {
                    return d.subregion;
                } else {
                    return d.key;
                }
            });
        t.append("tspan")
            .attr("dy", "1.0em")
            .text(function(d) { return formatNumber(d.value); });
        t.call(text);

        g.selectAll("rect")
            .style("fill", function(d) { return color(d.key); });

        function transition(d) {
          if (transitioning || !d) return;
          transitioning = true;

          var g2 = display(d),
              t1 = g1.transition().duration(750),
              t2 = g2.transition().duration(750);

          // Update the domain only after entering new elements.
          x.domain([d.x, d.x + d.dx]);
          y.domain([d.y, d.y + d.dy]);

          // Enable anti-aliasing during the transition.
          svg.style("shape-rendering", null);

          // Draw child nodes on top of parent nodes.
          svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

          // Fade-in entering text.
          g2.selectAll("text").style("fill-opacity", 0);

          // Transition to the new view.
          t1.selectAll(".ptext").call(text).style("fill-opacity", 0);
          t1.selectAll(".ctext").call(text2).style("fill-opacity", 0);
          t2.selectAll(".ptext").call(text).style("fill-opacity", 1);
          t2.selectAll(".ctext").call(text2).style("fill-opacity", 1);
          t1.selectAll("rect").call(rect);
          t2.selectAll("rect").call(rect);

          // Remove the old node when the transition is finished.
          t1.remove().each("end", function() {
            svg.style("shape-rendering", "crispEdges");
            transitioning = false;
          });
        }

        return g;
      }

      function text(text) {
        text.selectAll("tspan")
            .attr("x", function(d) { return x(d.x) + 6; })
        text.attr("x", function(d) { return x(d.x) + 6; })
            .attr("y", function(d) { return y(d.y) + 6; })
            .style("opacity", function(d) { return this.getComputedTextLength() < x(d.x + d.dx) - x(d.x) ? 1 : 0; });
      }

      function text2(text) {
        text.attr("x", function(d) { return x(d.x + d.dx) - this.getComputedTextLength() - 6; })
            .attr("y", function(d) { return y(d.y + d.dy) - 6; })
            .style("opacity", function(d) { return this.getComputedTextLength() < x(d.x + d.dx) - x(d.x) ? 1 : 0; });
      }

      function rect(rect) {
        rect.attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y); })
            .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
            .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
      }

      function name(d) {
        return d.parent
        ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.value) + ")"
        : d.key + " (" + formatNumber(d.value) + ")";



      }
    }

    if (window.location.hash === "") {
        d3.json(path+"treemap.json", function(err, res) {
            if (!err) {
                console.log(res);
                var data = d3.nest().key(function(d) { return d.region; }).key(function(d) { return d.subregion; }).entries(res);
                main({title: "UK Accidents - District Wise(Based on weather conditions)"}, {key: "UK", values: data});
            }
        });
    }
}

function group_bar_chart(id) {


    var div = d3.select(id);
    div.selectAll("*").remove();

    var margin = {top: (parseInt(960, 10)/10), right: (parseInt(960, 10)/20), bottom: (parseInt(960, 10)/5), left: (parseInt(960, 10)/20)},
    width = parseInt(960, 10) - margin.left - margin.right,
    height = parseInt(500, 10) - margin.top - margin.bottom;

    var x0 = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

    var x1 = d3.scale.ordinal();

    var y = d3.scale.linear()
        .range([height, 0]);

    var colorRange = d3.scale.category20();
    var color = d3.scale.ordinal()
        .range(colorRange.range());

    var xAxis = d3.svg.axis()
        .scale(x0)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    var divTooltip = d3.select(id).append("div").attr("class", "toolTip");


    var svg = d3.select(id).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


//    dataset = [
//        {label:"Men", "Not Satisfied":20, "Not Much Satisfied":10, "Satisfied": 50, "Very Satisfied":20},
//        {label:"Women", "Not Satisfied":15, "Not Much Satisfied":30, "Satisfied":40, "Very Satisfied":15}
//    ];

    var dataset = [];
    d3.json(path+"group_bar_h_type.json", function(err, res) {
        dataset = res;
        var options = d3.keys(dataset[0]).filter(function(key) { return key !== "label"; });

        console.log(options)

        dataset.forEach(function(d) {
            d.valores = options.map(function(name) { return {name: name, value: +d[name]}; });
        });

        x0.domain(dataset.map(function(d) { return d.label; }));
        x1.domain(options).rangeRoundBands([0, x0.rangeBand()]);
        y.domain([0, d3.max(dataset, function(d) { return d3.max(d.valores, function(d) { return d.value; }); })]);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Log of number of accidents");

        var bar = svg.selectAll(".bar")
            .data(dataset)
            .enter().append("g")
            .attr("class", "rect")
            .attr("transform", function(d) { return "translate(" + x0(d.label) + ",0)"; });

        bar.selectAll("rect")
            .data(function(d) { return d.valores; })
            .enter().append("rect")
            .attr("width", x1.rangeBand())
            .attr("x", function(d) { return x1(d.name); })
            .attr("y", function(d) { return y(d.value); })
            .attr("value", function(d){return d.name;})
            .attr("height", function(d) { return height - y(d.value); })
            .style("fill", function(d) { return color(d.name); });

        bar
            .on("mousemove", function(d){
                divTooltip.style("left", d3.event.pageX+10+"px");
                divTooltip.style("top", d3.event.pageY-25+"px");
                divTooltip.style("display", "inline-block");
                var x = d3.event.pageX, y = d3.event.pageY
                var elements = document.querySelectorAll(':hover');
                l = elements.length
                l = l-1
                elementData = elements[l].__data__
                divTooltip.html((d.label)+"<br>"+elementData.name+"<br>"+elementData.value);
            });
        bar
            .on("mouseout", function(d){
                divTooltip.style("display", "none");
            });


        var legend = svg.selectAll(".legend")
            .data(options.slice())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
            .attr("x", width + 36)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);

        legend.append("text")
            .attr("x", width + 28)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function(d) { return d; });

    });
}

function display_scatterplot_matrix(id) {


    var width = 960,
        size = 230,
        padding = 20;

    var x = d3.scale.linear()
        .range([padding / 2, size - padding / 2]);

    var y = d3.scale.linear()
        .range([size - padding / 2, padding / 2]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(6);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(6);

    var color = d3.scale.category10();

    d3.csv(path+"top_squared_loadings.csv", function(error, data) {
      if (error) throw error;

      data.forEach(function(d) {
      d['day_of_week'] = +d['day_of_week'];
      d['was_vehicle_left_hand_drive?'] = +d['was_vehicle_left_hand_drive?'];
      d['carriageway_hazards'] = +d['carriageway_hazards'];
    });


      var domainByTrait = {},
          traits = d3.keys(data[0]).filter(function(d) { return d !== "count"; }),
          n = traits.length;

      traits.forEach(function(trait) {
        domainByTrait[trait] = d3.extent(data, function(d) { return d[trait]; });
      });

      xAxis.tickSize(size * n);
      yAxis.tickSize(-size * n);

      var brush = d3.svg.brush()
          .x(x)
          .y(y)
          .on("brushstart", brushstart)
          .on("brush", brushmove)
          .on("brushend", brushend);

      var svg = d3.select(id).append("svg")
          .attr("width", size * n + padding)
          .attr("height", size * n + padding)
        .append("g")
          .attr("transform", "translate(" + padding + "," + padding / 2 + ")");

      svg.selectAll(".x.axis")
          .data(traits)
        .enter().append("g")
          .attr("class", "x axis")
          .attr("transform", function(d, i) { return "translate(" + (n - i - 1) * size + ",0)"; })
          .each(function(d) { x.domain(domainByTrait[d]); d3.select(this).call(xAxis); });

      svg.selectAll(".y.axis")
          .data(traits)
        .enter().append("g")
          .attr("class", "y axis")
          .attr("transform", function(d, i) { return "translate(0," + i * size + ")"; })
          .each(function(d) { y.domain(domainByTrait[d]); d3.select(this).call(yAxis); });

      var cell = svg.selectAll(".cell")
          .data(cross(traits, traits))
        .enter().append("g")
          .attr("class", "cell")
          .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
          .each(plot);

      // Titles for the diagonal.
      cell.filter(function(d) { return d.i === d.j; }).append("text")
          .attr("x", padding)
          .attr("y", padding)
          .attr("dy", ".71em")
          .text(function(d) { return d.x; });

      cell.call(brush);

      function plot(p) {
        var cell = d3.select(this);

        x.domain(domainByTrait[p.x]);
        y.domain(domainByTrait[p.y]);

        cell.append("rect")
            .attr("class", "frame")
            .attr("x", padding / 2)
            .attr("y", padding / 2)
            .attr("width", size - padding)
            .attr("height", size - padding);

        cell.selectAll("circle")
            .data(data)
          .enter().append("circle")
            .attr("cx", function(d) { return x(d[p.x]); })
            .attr("cy", function(d) { return y(d[p.y]); })
            .attr("r", 4)
            .style("fill", function(d) { return 'steelblue'; });
      }

      var brushCell;

      // Clear the previously-active brush, if any.
      function brushstart(p) {
        if (brushCell !== this) {
          d3.select(brushCell).call(brush.clear());
          x.domain(domainByTrait[p.x]);
          y.domain(domainByTrait[p.y]);
          brushCell = this;
        }
      }

      // Highlight the selected circles.
      function brushmove(p) {
        var e = brush.extent();
        svg.selectAll("circle").classed("hidden", function(d) {
          return e[0][0] > d[p.x] || d[p.x] > e[1][0]
              || e[0][1] > d[p.y] || d[p.y] > e[1][1];
        });
      }

      // If the brush is empty, select all circles.
      function brushend() {
        if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
      }
    });

    function cross(a, b) {
      var c = [], n = a.length, m = b.length, i, j;
      for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
      return c;
    }

}

function speedometer(id) {

    var svg = d3.select(id)
                .append("svg:svg")
                .attr("width", 400)
                .attr("height", 400);


        var gauge = iopctrl.arcslider()
                .radius(120)
                .events(false)
                .indicator(iopctrl.defaultGaugeIndicator);
        gauge.axis().orient("in")
                .normalize(true)
                .ticks(12)
                .tickSubdivide(3)
                .tickSize(10, 8, 10)
                .tickPadding(5)
                .scale(d3.scale.linear()
                        .domain([0, 160])
                        .range([-3*Math.PI/4, 3*Math.PI/4]));

        var segDisplay = iopctrl.segdisplay()
                .width(80)
                .digitCount(6)
                .negative(false)
                .decimals(0);

        svg.append("g")
                .attr("class", "segdisplay")
                .attr("transform", "translate(130, 200)")
                .call(segDisplay);

        svg.append("g")
                .attr("class", "gauge")
                .call(gauge);

        segDisplay.value(45785);
        gauge.value(92);

}
