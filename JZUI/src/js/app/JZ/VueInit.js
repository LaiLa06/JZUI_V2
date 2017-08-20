var Config = require('./Config');
var Ajax = require('./Ajax');
var Pages = require('./Pages');
var TableResizable = require('./Table.Resizable');

//初始化全局Vue ---------集成Table相关插件-------
var tableQueue = new Object();
var TableGolbal = function(opts){
	var settings={
			vm:null,		//(必需)全局Vue对象
			dataCheckes:'',	//(多选)(必需)多选容器标识,用于存放选择的结果。如:vm.UserListSelects=[1,4,5]
		    dataCheckFilter://(多选)(可选)判断是否允许选中
		    null,
		    dataCheckesCallBack:function(){},//选中checkbox执行
		    key:'',			//(多选)(必需)主键
		    keyType:'int',	//(多选)(可选)主键数据类型
		    selectRows:true,//选中行样式（关联checkbox）
			el_data:null,	//本参数无需传递
			data:'items',	//(必需)数据集合标识
			url:'',			//(必需)数据源接口地址
			relative:true,	//(可选)是否设置请求相对父路径
			autoRequest:true,  //自动请求
			jsonp:false,		//(可选)使用异步数据接口
		    dataSource:'',	//(可选)表格的数据源集合标识,默认值为(pageInfo.resultList)
			el_pager:'',		//(分页)(必需)分页容器
			pageNum:1,		//(分页)(可选)初始页码
			limit:10,		//(分页)(可选)每页条数
			page:true,		//(分页)(不需)是否分页
			resizable:false,//可拖拽列
			singleLine:false,//单行显示单元格
			onRequestData:function(){},
			callback:function(){},//渲染后执行
			onRenderData:function(){}//渲染前执行
	}; 
	$.extend(settings,opts);
	
	console.log(settings);
	if(settings.resizable){
		if(!TableResizable.isLoad())
			TableResizable.Load();//此处resizable暂时没有用到
	}
	if(settings.page){
		if(settings.el_pager!=''){
			settings.page = true;
		}else{
			settings.page = false;
		}
	}
	var obj = new Object();
	obj.vm = settings.vm;
	obj.url = settings.url;
	obj.pageNum = settings.pageNum;
	obj.limit = settings.limit;
	obj.total = 0;
	obj.page = settings.page;
	obj.loadPage = false;
	obj.init = function(){
		var _object = obj;
		if(settings.autoRequest) 
			_object.requestData();
	}
	obj.initPage = function(){
		var _object = obj;
		Pages.Load({ 
			control: settings.el_pager, 
			pageid: _object.pageNum,  
			show_sumRows:true,
			pagesize: _object.limit, 
			sumrows: _object.total, 
			fun: function (index) {
				if(_object.loadPage){
					_object.pageNum = index; 
			    	_object.requestData();
			    }
			}
		});
	}; 
	obj.clearPage = function(){
		$(settings.el_pager).html('');
	};
	obj.setUrl= function(url){obj.url=url}; 
	obj.data;
	obj.reload = function(){
		var _object = obj;
		//reload通常伴随着请求更改，此处作分页重绘 
		_object.loadPage = false;
		_object.requestData(); return;
		if(!_object.loadPage){//手动载入
			_object.requestData();
		}else{
			_object.pageNum = 1;
			//reload通常伴随着请求更改，此处作分页重绘 
			_object.loadPage = false;
			_object.requestData(); 
		}
	};
	obj.refresh = function(){ obj.requestData(); };
	obj.requestData = function(){ 
		if(settings.resizable)
			settings.el_data.addClass('table-resizable');
		var _object = obj;
		if(!_object.page){
			if(opts.limit == undefined) _object.limit = 9999;
		}
		if(settings.url==''){
			_object.renderData([]);
			return;
		}
		var splits = (_object.url.indexOf('?')>0?'&':'?'); 
		var url= _object.url + splits + 'pageNum='+_object.pageNum+'&pageSize='+_object.limit; 
		console.log(url);
		Ajax.Ajax({
	  	 	url:url,
	  	 	jsonp:settings.jsonp,
	  	 	relative:settings.relative,
	   		success:function(data){
	   			obj.data = data;
	   			if(!_object.page){
	   				if(data[settings.dataSource]!=undefined)
	   					data = data[settings.dataSource];
	   				else
	   					data = data.pageInfo.resultList;
	   				_object.total = data.length;
	   			}else{
	   				_object.total=data.pageInfo.totalNum;
	   				data = data.pageInfo.resultList;
	   			} 
	   			
		   		if(data.length==0){
	    	   	    		if(_object.page && !_object.loadPage) _object.clearPage();
	    				settings.onRequestData([]);
	    	   	    		_object.renderData([]);
		   		}else{
		    	   	    	for(var i=0;i<data.length;i++){
		    	   	    		data[i].vueIndex=(i+1)+_object.limit*(_object.pageNum-1);	
		    	   	    	}
			   	    	if(_object.page && !_object.loadPage) _object.initPage();
	    				settings.onRequestData(data);
	    	   	    		_object.renderData(data);
	   			}
			},
			error:function(){ 
			}
		});
	};
	
	var resizable = null;
	//数组变动后更新dom实现可拖拽列及单行显示(支持外部调用)
	obj.renderDom = function(){
		var _object = obj;
		if(settings.singleLine){
			settings.el_data.removeClass('table-resizable');
			if(!_object.loadPage){ 
				var ths = settings.el_data.find('thead th');
				for(var i=0;i<ths.length;i++){
					var thWidth = ths.eq(i).width();
					ths.eq(i).css({width:thWidth});
					var _div = ths.eq(i).find('.rc-div');
					if(!_div.hasClass('rc-cells')){ 
						_div.addClass('rc-cells').after('<div class="rc-td" style="width1:'+_div.width()+'px;opacity:0;">'+_div.text()+'</div>');
					}
				} 
				
			} 
			var divs = settings.el_data.find('tbody td .rc-div'); 
			for(var i=0;i<divs.length;i++){divs.eq(i).addClass('rc-cells').after('&nbsp;');} 
		}
		if(settings.resizable){
			if(resizable!=null){
				settings.el_data.siblings('.rc-handle-container').remove();
			}
			setTimeout(function(){  
				resizable = settings.el_data.resizableColumns();
			},10);
		}
	};
	obj.renderData = function(data){
		var _object = obj;
		_object.vm[settings.data] = data;
	    	obj.vm.$nextTick(function(){ 
			settings.onRenderData();
			settings.callback(data);
			if(settings['dataCheckes']!=undefined && settings['dataCheckes']!='' && settings.selectRows){
				_object.vm[settings.dataCheckes].map(function(item){
					settings.el_data.find('input[value='+item+']').closest('tr').addClass('info');
				});
				settings.el_data.find('tbody td').click(function(event){
					if("TD,DIV".indexOf(event.target.tagName)>=0){
						var cbx = $(this).closest('tr').find('td:eq(0) input[type=checkbox]');
						if(cbx!=undefined && cbx!=null){
							var value = cbx.val();
							if(cbx.is(':checked')){
								_object.vm[settings.dataCheckes] = _object.vm[settings.dataCheckes].removeByValue(value);
							}else{
								switch(settings.keyType){
									case 'int':
										_object.vm[settings.dataCheckes] = _object.vm[settings.dataCheckes].mergeArray([parseInt(value)]);
										break;
									case 'float':
										_object.vm[settings.dataCheckes] = _object.vm[settings.dataCheckes].mergeArray([parseFloat(value)]);
										break;
									case 'string':
										_object.vm[settings.dataCheckes] = _object.vm[settings.dataCheckes].mergeArray([value]);
										break;
								}
								
							}
						}
					} 
				});
			}
			obj.renderDom();//1.渲染dom，2.添加resizable,
			_object.loadPage=true;
	    	});
	}; 
	obj.init();
	return obj; 
}

var TableConfig = function(opts){
	var settings={
			//data:'',		//(必需)数据集合标识
			//url:'',			//(必需)数据源接口地址
		    //dataCheckes:'',	//(多选)(必需)多选容器标识,用于存放选择的结果。如:vm.UserListSelects=[1,4,5]
		    //dataCheckFilter://(多选)(可选)判断是否允许选中
		    //null,
		    selectRows:true,//点击行选中
		    dataCheckesCallBack:function(){},
			//relative:true,	//(可选)是否设置请求相对父路径
			//dataSource:'',	//(可选)表格的数据源集合标识,默认值为(pageInfo.resultList)
			//el_pager:'',	//(分页)(必需)分页容器
			limit:undefined,//(分页)(可选)每页条数
			//page:true		//(分页)(不需)是否分页
	};
	$.extend(settings,opts);
	tableQueue[settings.data] = settings;
	var obj = tableQueue[settings.data].tableGolbal;
	return {
		url:function(url){
			var obj = tableQueue[settings.data].tableGolbal;
			return obj.url; 
		},
		setUrl : function(url){
			var obj = tableQueue[settings.data].tableGolbal;
			obj.url = url;
		},
		getTotal : function(){
			var obj = tableQueue[settings.data].tableGolbal;
			return obj.total;
		},
		getPageNum : function(){
			var obj = tableQueue[settings.data].tableGolbal;
			return obj.pageNum;
		},
		getData : function(){
			var obj = tableQueue[settings.data].tableGolbal;
			return obj.data;
		},
		reload : function(url){
			var obj = tableQueue[settings.data].tableGolbal;
			obj.pageNum = 1;
			obj.reload(); 
		},
		refresh : function(url){
			var obj = tableQueue[settings.data].tableGolbal;
			obj.refresh(); 
		},
		renderDom : function(url){
			var obj = tableQueue[settings.data].tableGolbal;
			obj.renderDom(); 
		}
	};
}

var VueInit = function(opts){
	Config.Base();
	var settings = {
		el:'body',
		tables:{},
		data:{},
		computed:{},
		filter:function(){},
		methods:{}
	};
	$.extend(settings,opts); 
	settings.filter();
	//添加配置出口
	var _tables = new Object();
	for(var k in settings.tables){
		_tables[k] = TableConfig(settings.tables[k]);
	}
	//添加全选功能
	for(var k in tableQueue){
		(function(key){ 
			var obj = tableQueue[key];
			obj.el_data = $('body').find('tr[v-for$=' + obj.data + ']').closest('table');
			
			if(obj.singleLine){
				var setModuleContent = function (cells){
					for(var i = 0; i<cells.length;i++){
						cells.eq(i).html('<div class="rc-div">'+cells.eq(i).html()+'</div>');
					}
				}
				setModuleContent(obj.el_data.find('[v-for]').find('td'));
				setModuleContent(obj.el_data.find('thead th'));
			}
			
			settings.data[obj.data]=[];
			if(obj['dataCheckes']!=undefined && obj['dataCheckes']!=''){
				//过滤掉不允许选中的内容，保存到结果池中
				var funDataCheck =function(arrs,_this){
					var arr=[];
					arrs.map(function(item){
						var oList = _this[obj.data].getByKeys(obj.key,[item]);
						var o = null;
						//如果是当前页的行，则执行条件判断
						if(oList.length>0){ 
							o = _this[obj.data].getByKeys(obj.key,[item])[0];  
							if(obj.dataCheckFilter(o)){
								arr.push(item); 
							}
						}else{//如果不是当前页的行，则直接添加
							arr.push(item);
						}
					});
					return arr; 
				} 
				//选择结果池
				settings.data[obj.dataCheckes+'_Pool']=[];
				//选择结果
				settings.computed[obj.dataCheckes]={ 
					get:function(){
						if(obj.dataCheckFilter!=null){
							this[obj.dataCheckes+'_Pool'] = funDataCheck(this[obj.dataCheckes+'_Pool'],this);
						}
				        return this[obj.dataCheckes+'_Pool']; 
					},
					set:function(value){
						//设置选中行颜色
						if(obj.dataCheckFilter!=null){
							value = funDataCheck(value,this);
						}
						if(obj.selectRows){
							obj.el_data.find('input[type="checkbox"]').closest('tr').removeClass('info');
							value.map(function(item){
								obj.el_data.find('input[value='+item+']').closest('tr').addClass('info');
							});
						}
						this[obj.dataCheckes+'_Pool'] = value;
						obj.dataCheckesCallBack(value);
					} 
				}
				settings.computed[obj.data+'_CheckAll']={ 
					  get: function() { 
						  //当前页的可选集合
						  var currPageKeys = null;
						  if(obj.dataCheckFilter!=null){
							  currPageKeys = funDataCheck(this[obj.data].getKeys(obj.key),this);
						  }else{
							  currPageKeys = this[obj.data].getKeys(obj.key);
						  }
						  if(obj.el_pager!=undefined && obj.el_pager!=''){  
					   			var flag = this[obj.dataCheckes+'_Pool'].isContains(currPageKeys);
					   			return flag;
					   	  }
						  return this[obj.data+'_CheckCount'] == currPageKeys.length;
				      },
				      set: function(value) {  
				    	  this[obj.dataCheckes] = value
				    	  	?this[obj.dataCheckes].mergeArray(this[obj.data].getKeys(obj.key))
				    		:this[obj.dataCheckes].removeByValues(this[obj.data].getKeys(obj.key));
				      }
				};
				settings.computed[obj.data+'_CheckCount']={
					 get: function() { 
				        return this[obj.dataCheckes].length;     
				      } 
				};
			}
		})(k);
	}
	var vm  = new Vue(settings);
	//设置初始化配置
	for(let k in tableQueue){
		(function(key){ 
			var table = tableQueue[k];
			table.vm = vm;
			table.tableGolbal = TableGolbal(table); 
		})(k);
	}
	vm.tables = _tables;
	return vm;
};

exports.TableGolbal = TableGolbal;
exports.TableConfig = TableConfig;
exports.VueInit = VueInit;
