(function() {
  'use strict';

  var d3 = require("d3");

  module.exports.initTimeSlider = initTimeSlider;
  module.exports.processOptions = processOptions;
  module.exports.addSetTimeIdMethod = addSetTimeIdMethod;
  module.exports.addRemoveMethods = addRemoveMethods;
  module.exports.getInitOptions = getInitOptions;
  module.exports.setPopup = setPopup;

  // Add a time slider if it does not already exist
  function initTimeSlider(map, timeLabels, initialTime) {
    var tslider;

    if (!map.controls._controlsById.tslider) {
      tslider = L.timeSlider({
        timeLabels: timeLabels,
        onTimeIdChange: function(timeId) {
          var types = ["minichart", "flow"];
          for (var i = 0; i < types.length; i++) {
            var layers = map.layerManager._byCategory[types[i]];
            for (var k in layers) {
              if (layers[k]) layers[k].setTimeId(timeId);
            }
          }
        }
      });
      map.controls.add(tslider, "tslider");
    } else {
      tslider = map.controls._controlsById.tslider;
      if (typeof timeLabels != "undefined") tslider.setTimeLabels(timeLabels);
    }

    var timeId;
    if (typeof initialTime != "undefined" && initialTime !== null) {
      timeId = tslider.toTimeId(initialTime);
    } else {
      timeId = tslider.getTimeId();
    }
    tslider.setTimeId(timeId);

    return timeId;
  }

  /* Convert options sent by R in a useful format for the javascript code.
     Args:
     - options: object sent by R
     - callback: function(opts, i) with 'opts' the options for a given layer
                 and 'i' the index of the given layer
   */
  function processOptions(options, callback) {
    for (var i = 0; i < options.length; i++) {
      var opts = [];
      var timesteps = getNumberOfTimesteps(options);

      for (var t = 0; t < timesteps; t++) {
        var opt = {};
        for (var k in options[i].dyn) {
          if (options[i].dyn.hasOwnProperty(k)) {
            opt[k] = options[i].dyn[k][t];
          }
        }

        opts.push(opt);
      }

      callback(opts, i, options[i].static);
    }
  }

  function getNumberOfTimesteps(options) {
    return options[0].timeSteps;
  }

  function getInitOptions(opts, staticOpts, timeId) {
    var opt = opts[timeId];
    for (var k in opt) {
      if (opt.hasOwnProperty(k)) {
        staticOpts[k] = opt[k];
      }
    }
    return staticOpts;
  }

  // Add to a leaflet class the method "setTimeId" to update a layer when timeId
  // changes.
  function addSetTimeIdMethod(className, updateFunName) {
    if (!L[className].prototype.setTimeId) {
      L[className].prototype.setTimeId = function(timeId) {
        if (timeId == this.timeId) return;

        if (typeof this.opts !== "undefined" && typeof this.opts[timeId] !== 'undefined') {
          var opt = this.opts[timeId];
          this[updateFunName](opt);
          var popup = setPopup(this, timeId);
          if (this.onChange) this.onChange(opt, popup, d3);
        }
        this.timeId = timeId;
      };
    }
  }

  function addRemoveMethods(className, groupName) {
    LeafletWidget.methods["remove" + className + "s"] = function(layerId) {
      if (layerId.constructor != Array) layerId = [layerId];
      for (var i = 0; i < layerId.length; i++) {
        this.layerManager.removeLayer(groupName, layerId[i]);
      }
    };

    LeafletWidget.methods["clear" + className + "s"] = function() {
      this.layerManager.clearLayers(groupName);
    };
  }

  function setPopup(l, timeId) {
    if (l.popupArgs.noPopup) return;

    if (l.opts[timeId].popupHTML) {
            if(l.isPopupOpen() === false){
        l.bindPopup(l.opts[timeId].popupHTML, l.popupOptions);
      } else {
        l.setPopupContent(l.opts[timeId].popupHTML);
      }
      /* l.bindPopup(l.opts[timeId].popupHTML, l.popupOptions); */
      return;
    }

    var title, content, popup;
    if (l.layerId && l.popupArgs.showTitle) title = "<h2>" + l.layerId + "</h2>";
    else title = "";
    content = "";
    if (l.opts[timeId].data) {
      var values, keys;
      if(l.popupArgs.showValues) {
        values = l.opts[timeId].data;
        keys = l.popupArgs.labels.concat(l.popupArgs.supLabels);
      } else {
        values = [];
        keys = l.popupArgs.supLabels;
      }

      if (l.opts[timeId].popupData) values = values.concat(l.opts[timeId].popupData);

      if (keys.length == 0) {
        content = values.join(", ");
      } else {
        var rows = [];
        for (var i = 0; i < values.length; i++) {
          var row = "";
          if (l.popupArgs.digits && isNumeric(values[i])) {
            values[i] = parseFloat(parseFloat(values[i]).toFixed(l.popupArgs.digits));
          }
          row += "<td class='key'>" + keys[i] + "</td>";
          row += "<td class='value'>" + values[i] + "</td>";
          row = "<tr>" + row + "</tr>";
          rows.push(row);
        }
        content = rows.join("");
        content = '<table><tbody>' + content +'</tbody></table>';
      }
    }

    popup =  '<div class="popup">'+ title + content + '</div>';
    /* l.bindPopup(popup.popupHTML, l.popupOptions); */
          if(l.isPopupOpen() === false){
        l.bindPopup(l.opts[timeId].popupHTML, l.popupOptions);
      } else {
        l.setPopupContent(l.opts[timeId].popupHTML);
      }
    return popup;
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
}());
