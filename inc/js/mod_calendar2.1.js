
var strixCalendar = new Class ({
	Binds:[ 'cleanupselector', 'onmousedown', 'resize', 'refreshevents', 'daytimeshift',
		'pos2time', 'time2pos', 'renderevent', 'eventpopup', 'editevent',
		'selectend', 'selectmove', 'saveEvent', 'deleteEvent', 'saveSuccess', 'dragElement' ],
	Implements: [Events, Options],
	options: {
		cellheight: 30,
		cellpadd: 3,
		numberofdays: out.numberofdays,
		daysgridxy: function(){},
		gridxy: function(){},
		scrolltoppos: 1,
		refreshArgument: function(){},
		newEvent: function(){},

		schoolweek: false,
		timeshift: 0,
		dayshift: 0,
		scrolltoppos2: 1,
		nr: 1
	},

	initialize: function (out, type, nr) {

		if (type=="schoolweek")
			this.options.schoolweek=true;

		if (nr==2)
			this.options.nr=2;

		this.options.daysgridxy = $("daysgridcontainer"+this.options.nr).getPosition();
		this.options.gridxy = $("gridcontainer"+this.options.nr).getPosition();

		this.resize();

		if (out.cal_vkat_writeable){
			$("daysgridcontainer"+this.options.nr).addEvent("mousedown", this.onmousedown);
		}
		$("gridcontainer"+this.options.nr).addEvent("scroll", function(){
			if (this.options.nr==2)
				this.options.scrolltoppos2=$('gridcontainer'+this.options.nr).getScroll().y;
			else
				this.options.scrolltoppos=$('gridcontainer'+this.options.nr).getScroll().y;
		}.bind(this));


		
		window.addEvent('resize', this.resize());

		this.refreshevents(out.weekarray);

		// ovi dolje eventi su zajednicki za oba rasporeda, pa ih dodajemo samo jedanput
		if (nr==2) return;

		// ako nismo logirani (tj nema forme za unos), izadji van
		if (!$('eventform')) return;

		//event asign za post formu
		$('eventform').addEvent('submit', function(e){
			new DOMEvent(e).stop();
			this.ajaxinprogress(true);
			this.hidePopup();
			this.saveEvent();
		}.bind(this));

		//obrisi event
		$('del_link').addEvent('click', function(e) {
			e.stop;
			this.hidePopup();
			this.deleteEvent();
		}.bind(this));

		//sakrij popup ukoliko se klikne na njegov pokazivac na polje
		$('baloon_pointer').addEvent('click', function(e) {
			this.hidePopup();
		}.bind(this));

		$('close-popup').addEvent('click', function(e) {
			this.hidePopup();
		}.bind(this));
	},

	hidePopup: function () {
		$('infowindow').hide();
		this.cleanupselector();
	},

	refreshevents: function (eventarray, dontscroll) {
		var event;
		var minscroll=0;
		eventsnode = $('events'+this.options.nr);
		while(eventsnode.firstChild) eventsnode.removeChild(eventsnode.firstChild);
		for (daynum in eventarray) {
			$('weekdate'+daynum).innerHTML=eventarray[daynum].weekdate;
			for ( currevent in eventarray[daynum].todaysevents ) {
				event = eventarray[daynum].todaysevents[currevent];
				event.ev_day = daynum - 1;
				if ((this.options.nr==2 && event.ev_day>6) || this.options.nr==1)
				this.renderevent(event);
				if (minscroll==0 || minscroll > event.ev_from) minscroll = event.ev_from;
			}
		}
		if (!dontscroll) $('gridcontainer1').scrollTop = minscroll * 40 - 20;
		this.options.refreshArgument = false;
	},

	renderevent: function(o) {
		if ($('event_template'+o.id)) $('event_template'+o.id).destroy();
		var newevent = $('event_template').clone(true,true);
		if (o.reoctype || o.writeable== 'f') newevent.className='revents';
		else {
			newevent.className='events';
		}
		newevent.id += o.id;

		newevent.getChildren().each(function(el) {
			el.id+=o.id;
		});

		if (this.options.schoolweek && o.ev_day > 6)
			$('events2').grab(newevent);
		else
			$('events1').grab(newevent);

		var po = this.time2pos(o);
		if(parseInt(po.height) <= 20){
			newevent.className='events-min';
		}
		
		newevent.style.top = po.top + 'px';
		newevent.style.left = po.left + this.options.cellpadd +'px';
		newevent.style.width = this.options.cellwidth - this.options.cellpadd + 'px';
		newevent.style.height = po.height + 'px';
		newevent.style.display = 'block';
		newevent.store('cal_ID', o.id);
		if (o.reoctype)
			newevent.store('reoc', true);
		else
			newevent.store('reoc', false);

		// print data
		$('ev_header'+o.id).set('html', this.fancytime(o.ev_from));
		$('ev_body'+o.id).set('html', o.ev_title);

		if (o.writeable != 't') return;

		if (!o.reoctype) {

			$(newevent).addEvent('mousedown', this.dragElement);

			var minResizeHeight=$('ev_header'+o.id).getStyle('height').toInt() + 8;

			$(newevent).makeResizable({
				handle: $('ev_footer'+o.id),
				grid: 1,
				snap: 1,
				limit: {x:[$(newevent).style.width.toInt(), $(newevent).style.width.toInt()], y:[minResizeHeight]},
				onComplete: function () {
					this.ajaxinprogress(true);
					var nt = this.pos2time(newevent);
					this.updateEvent('cal_ID='+o.id+'&cfrom_Date='+nt.cfrom_Date+'&cfrom_Hour='+nt.cfrom_Hour+'&ctill_Hour='+nt.ctill_Hour+'&cfrom_Minute='+nt.cfrom_Minute+'&ctill_Minute='+nt.ctill_Minute);
					if(parseInt(newevent.style.height) <= 20)
						 newevent.className='events-min';
					else
						newevent.className='events';
				}.bind(this)
			});

			$('ev_header'+o.id).style.cursor = 'move';
			$('ev_footer'+o.id).style.cursor = 's-resize';
		}
		else {
			 $(newevent.id).addEvent('mousedown', function(e){e.stop();});
		}

		// enable edit
		$('ev_body'+o.id).addEvent("mousedown", this.editevent);
	},

	dragElement: function(e) {
		e.stopPropagation();
		parentID = $(e.target.id).getParent().id;
		if ($(parentID).parentNode.id=="events1")
			this.options.nr = 1;
		else
			this.options.nr = 2;

		limity = $('gridcontainer'+this.options.nr).getCoordinates().height - $(parentID).style.height.toInt() + $('gridcontainer'+this.options.nr).getScroll().y;
		limitx = this.options.numberofdays * this.options.cellwidth - $(parentID).style.width.toInt() + this.options.cellpadd;

		cal_ID = $(parentID).retrieve('cal_ID');

		$(parentID).makeDraggable({
			handle: $('ev_header'+cal_ID),
			grid: 5,
			snap: 5,
			limit: {x:[this.options.cellpadd, limitx],y:[0,limity]},
			onComplete: function(element){
				this.ajaxinprogress(true);
				var xy = element.getPosition('daysgridcontainer'+this.options.nr);
				var x = (xy.x / this.options.cellwidth).round() * this.options.cellwidth;
				offset = (xy.x/this.options.cellwidth).toInt();
				if (offset<=3) offset += 3-offset;

				element.setPosition({x:x+offset, y:xy.y});
                                var nt = this.pos2time($(parentID));
				this.updateEvent('cal_ID='+cal_ID+'&cfrom_Date='+nt.cfrom_Date+'&cfrom_Hour='+nt.cfrom_Hour+'&ctill_Hour='+nt.ctill_Hour+'&cfrom_Minute='+nt.cfrom_Minute+'&ctill_Minute='+nt.ctill_Minute);
			}.bind(this)
		});
	},

	pos2time: function(o) {
		
		if (this.options.schoolweek) {
			if (o.id=="selector1" || o.parentNode.id=="events1")
				this.daytimeshift('am');
			else
				this.daytimeshift('pm');
		}

		var ret = new Object();

		ret.ev_from = (parseInt(o.style.top)/this.options.cellheight + 0.5)/2 + this.options.timeshift;
		ret.ev_to = ret.ev_from + parseInt(o.style.height)/2/this.options.cellheight;
		if(o.style.height < 0)
			ret.ev_to = ret.ev_from + 1;

		ret.ev_day = parseInt(parseInt(o.style.left)/this.options.cellwidth) + this.options.dayshift;
		ret.cfrom_Date = out.weekarray[ret.ev_day+1].isodate;
		ret.cfrom_Hour = Math.floor(parseInt(o.style.top) / 60) + this.options.timeshift;
		ret.ctill_Hour = Math.floor((parseInt(o.style.top) + parseInt(o.style.height)) / 60) + this.options.timeshift;
		ret.cfrom_Minute = parseInt(o.style.top) % 60;
		ret.ctill_Minute = (parseInt(o.style.top) + parseInt(o.style.height)) % 60;
		return ret;
	},
	
	daytimeshift: function (shift) {
		if (shift=="am") {
			this.options.timeshift = 7;
			this.options.dayshift = 0;
		} else {
			this.options.timeshift = 12;
			this.options.dayshift = 7;
		}
	},

	time2pos: function (o) {
		if (this.options.schoolweek) {
			if (o.ev_day > 6)
				this.daytimeshift('pm');
			else
				this.daytimeshift('am');
		}

		this.top = (o.ev_from - this.options.timeshift ) * 2 * this.options.cellheight;
		this.height = ((o.ev_to - o.ev_from) * 2 * this.options.cellheight).round();
		this.left = (o.ev_day - this.options.dayshift ) * this.options.cellwidth;
		return this;
	},

	onmousedown: function (e) {
		this.cleanupselector();
		$('nr').value=this.options.nr;
		var grid = $('gridcontainer'+this.options.nr);
		var xy = [e.page.x, e.page.y];
		var layerxy = [xy[0]-this.options.daysgridxy.x+this.options.cellpadd, xy[1]-this.options.daysgridxy.y+grid.scrollTop];
		var layerxy_grid = [parseInt(layerxy[0] / this.options.cellwidth) * this.options.cellwidth, parseInt(layerxy[1] / this.options.cellheight) * this.options.cellheight];
		$('selector'+this.options.nr).show();
		$('selector'+this.options.nr).setPosition({x:layerxy_grid[0]+this.options.cellpadd, y:layerxy_grid[1]});
		$("gridcontainer"+this.options.nr).addEvent("mouseup", this.selectend);
		$("gridcontainer"+this.options.nr).addEvent("mousemove", this.selectmove);
	},

	cleanupselector: function () {
                $('selector1').hide();
                $('selector1').setStyle('height', this.options.cellheight + 'px');

		if(this.options.schoolweek) {
			$('selector2').hide();
			$('selector2').setStyle('height', this.options.cellheight + 'px');
		}
	},

	resize: function () {
		var newcellwidth = $('daysgridcontainer'+this.options.nr).clientWidth/this.options.numberofdays;
		evs = $('events'+this.options.nr);
		for (var i=evs.childNodes.length-1; i>=0; --i ) {
			var o = evs.childNodes[i];
			o.style.width = newcellwidth - this.options.cellpadd;
			o.style.left = parseInt(parseInt(o.style.left)/this.options.cellwidth) * newcellwidth + this.options.cellpadd;
		}
		$('selector'+this.options.nr).setStyle('width', (newcellwidth - this.options.cellpadd) + 'px');
		$('event_template').setStyle('width', (newcellwidth - this.options.cellpadd) + 'px');
		$('gridcontainer'+this.options.nr).scrollTop = this.options.scrolltoppos;
		var newgridwidth = $('gridcontainer'+this.options.nr).clientWidth;
		$('headcolumn').setStyle('width', (newgridwidth-16.4)*94.5/newgridwidth+'%');
		this.options.cellwidth = newcellwidth.toInt();
	},

	eventpopup: function(fromobject, title, calid) {
		if (calid == "" || fromobject.retrieve('reoc')) 
			$('del_link').hide();
		else 
			$('del_link').show();

		var times = this.pos2time(fromobject);
		var evform = $('eventform');
		evform.cfrom_Date.value = times.cfrom_Date;
		evform.cfrom_Hour.value = times.cfrom_Hour;
		evform.ctill_Hour.value = times.ctill_Hour;
		evform.cfrom_Minute.value = times.cfrom_Minute;
		evform.ctill_Minute.value = times.ctill_Minute;
		evform.cal_title.value = title;
		evform.cal_ID.value = calid;
		var m_from = times.cfrom_Minute;
		var m_till = times.ctill_Minute;
		if (m_from < 10)
			m_from = '0' + m_from;

		if (m_till < 10)
			m_till = '0' + m_till;

		evform.elements["cal_categories[0]"].value = out.cal_vkat;
		$('neweventtime').innerHTML=out.weekarray[times.ev_day+1].name + ', ' + out.weekarray[times.ev_day+1].date+'<br>'+times.cfrom_Hour+':'+m_from+' - '+times.ctill_Hour+':'+m_till;
		
		var selectorxy = $(fromobject).getPosition();
		info_x =selectorxy.x + this.options.cellwidth/2 - 110;
		info_y = selectorxy.y + (parseInt($(fromobject).getStyle('height'))/2) - 171;

		$('infowindow').show();
		$('infowindow').setPosition({x:info_x,y:info_y});
		
	},

	editevent: function(e) {
		target = e.target;
		e.stop();

		//target.id ima prefix 'ev_body'+calid i trebamo samo broj
		//prefix 'ev_body' se ne smije mijenjati
		this.eventpopup(target.parentNode, target.innerHTML, target.id.substring(7));
	},

	selectend: function(e) {
		this.eventpopup($("selector"+this.options.nr),"","");
		$("gridcontainer"+this.options.nr).removeEvent("mouseup", this.selectend);
		$("gridcontainer"+this.options.nr).removeEvent("mousemove", this.selectmove);
	},

	selectmove: function(e) {
		var height = parseInt((e.page.y-$('selector'+this.options.nr).getPosition().y) / this.options.cellheight ) * this.options.cellheight;
		$('selector'+this.options.nr).setStyle('height', height + 'px');
	},

	ajaxinprogress: function(inprogress) {
		if (inprogress)	{
			$('calindicator').show();
		} else {
			$('calindicator').hide();
		}
	},

	getEvent: function () {
		var req=new Request({
			url: '/?kat=200&_ajax=1',
			method: 'get',
			onSuccess: function (responseText, responseXML) {
				out = eval('(' + responseText + ')'); 
				$('weektitle').innerHTML = out['weektitle'];
				this.refreshevents(out.weekarray);
				this.ajaxinprogress(false); 
			},
			onFailure: function () {
				alert('Gre¹ka prilikom dohvata dogaðaja!');
			}		
		});
	},

	saveEvent: function (query) {
		if ($('eventform').cal_ID.value.length==0){
			url='/?kat=200&_ajax=1';
			var event='create';
		}
		else {
			url='/?kat=200&_ajax=1&cal_updatetitle=true';
			var event='updatetitle';
		}
		var req = new Request.JSON({
			method: 'post',
			url: url,
			data: $('eventform').toQueryString(),
			onSuccess: function (responseText, responseXML) {
				this.saveSuccess(event, responseText);
			}.bind(this),
			onFailure: function () {
				alert('Do¹lo je do pogre¹ke prilikom kreiranja dogaðaja');
			}
		});
		req.send();
	},

	updateEvent: function (params) {
		var req = new Request.JSON({
			method: 'post',
			url: '/?kat=200&_ajax=1&cal_updatetimes=1',
			data: params,
			onSuccess: function(responseText, responseXML) {
				this.saveSuccess('update', responseText);
			}.bind(this),
			onFailure: function() {
				alert('Gre¹ka prilikom a¾uriranja dogaðaja');
			}
		});
		req.send();
	},

	saveSuccess: function (action, response) {
		this.options.refreshArgument = true;
		this.cleanupselector();
		if (response.reoc) return this.getEvent();

		if (action=='update')
			$('ev_header'+response.id).innerHTML = this.fancytime (response.ev_from);

		if (action=='updatetitle')
			$('ev_body'+response.id).innerHTML = response.ev_title;

		if (action=='delete')
			$('event_template'+response.id).destroy();

		if (action=='create') {
			if ($('nr').value==2)
				response.ev_day += 7;
			this.renderevent(response);
			$('ev_body'+response.id).innerHTML = response.ev_title;
		}
		this.ajaxinprogress(false);
	},
	
	deleteEvent: function () {
		this.ajaxinprogress(true);
		var req = new Request.JSON({
			method:'post',
			url:'?_ajax=1',
			data:  'cal_Delete=true&cal_ID='+$('cal_ID').value,
			onSuccess: function (responseText, responseXML) {
				this.saveSuccess('delete', responseText);
			}.bind(this),
			onFailure: function () {
				alert('Gre¹ka prilikom brisanja dogaðaja');
			}
		});
		req.send();
	},

	fancytime: function(intime) {
		var h=parseInt(intime);
		var m=Math.round((intime-h) * 60); 
		
		if (m<10) m='0' + m;
		return h+':'+m;
	}


});

	// advanced form
	function cal_editpopup() {
			neww = window.open("about:blank", "newentry", "toolbar=0,scrollbars=yes,location=0,statusbar=0,menubar=0,resizable=yes,width=440px,height=340px");
			document.getElementById('eventform').submit();
			neww.focus();
	}
