/***
 * sql query tool ,用于简化mysql查询中一些比较简单的查询可直接进行调用函数使用。
 * 函数中的主要工作为sql的拼接，并提供mysql的实例查询。
 * @author chrunlee
 * @github https://github.com/chrunlee
 ***/

let query = require('simple-mysql-query');

let tool = {
	config : {
		//是否打印sql语句
		sql : false
	},
	/***
	 * query 提供直接进行的sql查询，一些复杂的查询语句，可以在拼接后直接使用该函数调用
	 * @demo
	 * let sql = `select * from table a left join table b on a.id = b.id where a.name like ? `;
	 * let params = ['%test%'];
	 * tool.query({
	 *    sql : sql,params : params
	 * }).then(rs=>{
	 *    console.log(rs);//返回查询结果
	 * })
	 * @params {Array/Object} ,包含 sql 以及params两个属性，可以支持多个sql语句一起使用,例如： tool.query([{sql : sqlA,params : paramsA},{sql : sqlB,params : paramsB}]).then(...)
	 * @return Promise
	 ***/
	query : query,
	/***
	 * 提供表名，查询表中的字段数据
	 * @params {String} table : 需要查看表的名字
	 * @return {Array} 返回表中的所有字段以及相关的属性
	 ***/
	desc (table){
		return query({sql :`desc ${table}`,params : []})
		.then(rs=>{
			return rs[0];
		});
	},
	_getScheme (){
		return tool.scheme;
	},
	_getLengthOfObj( obj ){
		let num = 0;
		if(!obj || typeof obj != 'object'){
			return num;
		}
		for(let n in obj){
			num ++;
		}
		return num;
	},
	/***
	 * 确定某个表
	 * @demo : tool.search('sys_user').list() //增加主表
	 * @params {String} table : 主表表名
	 * @return tool ,返回tool,需要继续调用其他的工具函数。
	 * @warning : 请注意，search函数会重置查询条件，所以在一次查询中只能使用一次search函数。
	 ***/
	search (table){
		// let scheme = tool.getScheme();
		tool.scheme = {};//置空
		let scheme = tool._getScheme();
		scheme.table = table;
		return tool;
	},
	/***
	 * 增加查询条件，关联关系为and
	 * @demo : 
	 * tool.search('sys_user').where({
	 * 		id : '111',
	 *		name : {
	 *			table : 't1',value : 'test' // table : join 表的别名
	 *		}	
	 * }).list()
	 * @params {Object} obj : 增加主表的查询条件，多个字段之间的关系为and关系
	 * @return {tool} 返回tool，继续使用其他工具函数
	 ***/
	where(obj){
		let scheme = tool._getScheme();
		scheme.where = obj;
		return tool;
	},
	/***
	 * left join 其他表进行关联
	 * @demo 
	 * tool.search('sys_user').join('sys_article',{
	 *  	alias : 't1',
  	 *		join : [{main :'id',foreign : 'userid'}] //main 主表字段名，foreign : join表字段名
	 * }).list()
	 * @params {String} table : 需要关联的表名
	 * @params {Object} options : 主表与从表的关联关系。查看@demo
	 * @return {tool} 返回tool，继续使用其他工具函数
	 ***/
	join(table,options){
		let scheme = tool._getScheme();
		scheme.join = (scheme.join||[]).concat([{table : table,options : options||{}}]);
		return tool;
	},
	/***
	 * 对查询的数据进行排序
	 * @demo 
	 * tool.search('sys_user').order({
	 *		column : 'createtime',order : 'desc',alias : 't1'//alias 表别名，不写为主表
	 * }).list()
	 * @params {Array/Object} orderArr : 可以直接传对象或数组，对象中的属性查看@demo的使用
	 ***/
	order( orderArr ){
		let scheme = tool._getScheme();
		orderArr = (typeof orderArr == 'object' && orderArr.length>=0) ? orderArr : [orderArr];
		scheme.order = (scheme.order||[]).concat(orderArr);
		return tool;
	},
	/***
	 * mysql的 or查询，关联关系为or.
	 * @demo tool.search('sys_user').where({name : 'test'}).or({title : 'test'}).list();
	 * or 中不同object之间的关系为 or 与 where的关系也为or,但是同一个object中的关系为and ，与like正好相反
	 * @params {Array/object} 提供or的字段与对应的value
	 * @return tool ,返回实例，继续调用其他工具函数。
	 *****/
	or( orobj ){
		let scheme = tool._getScheme();
		scheme.or = (scheme.or||[]).concat(orobj);
		return tool;
	},
	//限制数据
	/***
	 * 对返回的条数进行限制或者分页
	 * @demo : tool.search('sys_user').limit(1,3).list();//limit(start,rows)
	 * @params {Number} start : 开始记录
	 * @params {Number} rows : 为返回的记录数量
	 * @return tool ,返回实例，继续调用其他工具函数。
	 ****/
	limit (start,rows){
		let scheme = tool._getScheme();
		scheme.limit = {start : start,rows : rows};
		return tool;
	},
	/***
	 * 对表内容进行查询，返回Array<Object>
	 * @demo : tool.search('sys_user').list();
	 * @warning 在list之后请不要使用其他的函数，list update delete insert count 为几个动作的终结函数调用，调用后返回数据
	 * @params none
	 * @return {Array<Object>} 返回查询的表的列表记录
	 *
	 ***/
	list (){
		return query(tool._createSql('select',tool._getScheme())).then(rs=>{
			return rs[0];
		})
	},
	/***
	 * 对表的数据进行更新
	 * @demo : tool.search('sys_user').where({id : '11'}).update({name : '更新数据'}); //对sys_user 表中的所有id为11的记录更新name为'更新数据'
	 * @params {Object} 要更新的字段以及对应的值
	 * @return {Object} 返回影响记录以及是否成功的数据
	 *
	 ***/
	update( data ){//更新data中的数据
		return query(tool._createSql('update',tool._getScheme(),data)).then(rs=>{
			return rs[0];
		});
	},
	/***
	 * 删除表中的某些记录
	 * @demo : tool.search('sys_user').where({id : '11'}).delete();//删除sys_user表中所有id为11的记录。
	 * @params none
	 * @return {Object} 返回影响记录以及是否成功的数据
	 *
	 ***/
	delete( ){//更新data中的数据
		return query(tool._createSql('delete',tool._getScheme())).then(rs=>{
			return rs[0];
		});
	},
	//插入语句，没有where等条件
	/***
	 * 将某些数据插入到表中
	 * @demo : tool.search('sys_user').insert({id : '1',name : 'test'});//插入sys_user表中记录一条。
	 * @params {Array/Object} ： 如果为Object ，则插入一条记录，Array插入多条记录。
	 * @return {Object} 返回影响记录以及是否成功的数据
	 *
	 ***/
	insert( data ){//更新data中的数据
		return query(tool._createSql('insert',tool._getScheme(),data)).then(rs=>{
			return rs[0];
		});
	},
	//只查询数量
	/***
	 * 查询符合条件的记录，一般来说可以通过list返回获得length,如果只需要获得数量，则可以使用这个函数。
	 * @demo : tool.search('sys_user').where({id : '1'}).count();//查询id为1的记录的数量
	 * @params none
	 * @return {Number} 返回数量
	 ***/
	count (){
		return query(tool._createSql('count',tool._getScheme())).then(rs=>{
			return rs[0][0].count;
		})
	},
	/***
	 * 获得返回列表中的某一个，默认返回第一个，指定index则返回指定index的记录
	 * @demo tool.search('sys_user').where({id : '1'}).get(1);//返回第二个记录，index从0开始。
	 * @params {Number} index : 索引，从0开始，默认为0。
	 * @return {Object} 返回对应索引的记录的对象数据
	 ***/
	get( index ){
		index = parseInt(index || 0);
		index = Math.max(index,0);
		return query(tool._createSql('select',tool._getScheme())).then(rs=>{
			return rs[0].length > index ? rs[0][index] : rs[0][0];
		})
	},
	//根据scheme生成sql
	_createSql (type,schemeObj,valueObj){
		let scheme = schemeObj || tool._getScheme();
		let sql = `${type} `;
		let params = [];
		//判断有没有join,如果有join,则给table命名 t1或给一个特定的id
		let tableAlias = ((+new Date())+'g').substr(8);

		/**
		 * select 查询相关语句
		 **/
		let isCount = false;
		if(type == 'count'){//如果是count类型，需要重新定义
		 	sql = 'select count(*) as count from ( select ';
		 	type = 'select';
		 	isCount = true;
		}
		if(type == 'select'){
			if(scheme.join && scheme.join.length > 0){
				//把join的table加入
				sql += scheme.join.reduce((_,a,i)=>{
					return _ +`${a.options.alias || 't'+i}.*,`;
				},'');
				sql += ` ${tableAlias}.*`;
			}else{
				sql += ` ${tableAlias}.* from ${scheme.table} as ${tableAlias}`;
			}
			//继续left join
			if(scheme.join && scheme.join.length > 0){
				sql += `  from ${scheme.table} as ${tableAlias}`;
				sql += scheme.join.reduce((_,a,i)=>{
					let alias = a.options.alias || 't'+i;//join 表的别名
					let joinStr = (a.options.join||[]).reduce((__,b,j)=>{
						return __ + `${j == 0 ? '' : 'and'} ${tableAlias}.${b.main} = ${alias}.${b.foreign} `;
					},'') || ` ${tableAlias}.id = ${alias}.id `;
					return _ + ` left join ${a.table} as ${alias} on ${joinStr}`;
				},'');
			}

			/***
			 * update 更新相关语句
 			 **/
		}else if(type == 'update'){
			sql += ` ${scheme.table} as ${tableAlias} set `;
			for(let key in valueObj){
				sql += ` ${key}=?,`;
				params.push(valueObj[key]||'');
			}
			sql = sql.substr(0,sql.length-1);

			/***
			 * delete 相关的语句
			 *
			 ***/
		}else if(type == 'delete'){
			sql += ` ${tableAlias} from ${scheme.table} as ${tableAlias}  `;

			/***
			 * insert into 语句插入
			 *
			 ***/
		}else if(type == 'insert'){
			if(valueObj instanceof Array){//为数组，批量插入
				sql += ` into ${scheme.table} ( `;
				let tempStr = ` values `;
				//获得固定的key顺序
				var keyArr = [];
				for(var key in valueObj[0]){
					keyArr.push(key);
					sql += ` ${key},`
				}
				sql = sql.substr(0,sql.length -1);
				sql += ' ) ';
				for(let i=0,max=valueObj.length;i<max;i++){
					var dataObj = valueObj[i];
					tempStr += ` ( `;
					for(let j=0;j<keyArr.length;j++){
						if(j == keyArr.length -1){
							tempStr += '? ';
						}else{
							tempStr += '?, ';
						}
						params.push(dataObj[keyArr[j]] || '');
					}
					tempStr += ')';
					if(i < valueObj.length -1){
						tempStr += ',';
					}
				}
				sql += tempStr;
				return {sql : sql,params : params};
			}else{
				sql += ` into ${scheme.table} ( `;
				//遍历data.,如果valueObj 为数组，那么则是批量插入
				let tempStr = ` values (`;
				for(var key in valueObj){
					sql += `${key},`;
					tempStr += `?,`;
					params.push(valueObj[key]);
				}
				sql = sql.substr(0,sql.length -1);
				tempStr = tempStr.substr(0,tempStr.length -1);
				tempStr += ') ';
				sql += ') '+tempStr;
				//insert 语句nowhere
				return {sql : sql,params : params};
			}
		}
		
		//where 语句
		if(tool._getLengthOfObj(scheme.where) > 0){
			//默认都是主表的字段，否则根据table -value 来定值
			sql += ` where`;
			for(let name in scheme.where){
				let nameOpt = scheme.where[name];
				let whereAlias = typeof nameOpt == 'object' ? (nameOpt.table || tableAlias) : tableAlias;
				let whereValue = typeof nameOpt == 'object' ? (nameOpt.value) : nameOpt;
				if(whereValue == null || whereValue == undefined){
					sql += ` ${whereAlias}.${name} is null and`;
				}else{
					let tempOperate = typeof nameOpt == 'object' ? (nameOpt.like ? 'like' : '=') : '='
					sql += ` ${whereAlias}.${name} ${tempOperate} ?  and`;
					params.push(whereValue);
				}
			}
			sql = sql.substr(0,sql.length -3);
		}
		//or 与where 类似，不同的是or里面都是用的and
		if(tool._getLengthOfObj(scheme.or) > 0){	
			sql += ` ${sql.indexOf('where') >-1 || sql.indexOf('and') >-1 ? ' or ' : ' where '}`;
			let tempSql = scheme.or.reduce((_,a,i)=>{
				let tempStr = '';
				for(let key in a){
					let tempAlias = typeof a[key] == 'object' ? (a[key].alias||tableAlias) : tableAlias;
					let tempValue = typeof a[key] == 'object' ? a[key].value : a[key];
					if(tempValue != null && tempValue != undefined){
						let tempOperate = typeof a[key] == 'object' ? (a[key].like ? 'like' : '=') : '='
						tempStr += ` ${tempAlias}.${key} ${tempOperate} ? and`;
						params.push(tempValue);
					}else{
						tempStr += ` ${tempAlias}.${key} is null and`;
					}
				}
				tempStr = tempStr.substr(0,tempStr.length-3);
				return _ + ` ( ${tempStr} ) or`;
			},'');
			tempSql = `( ${tempSql.substr(0,tempSql.length -2)} )`;
			sql += tempSql;
		}
		
		//多条order记录，按照顺序来
		if(tool._getLengthOfObj(scheme.order) > 0){
			sql += ` order by `;
			sql = scheme.order.reduce((_,a,i)=>{
				return sql + ` ${a.alias||tableAlias}.${a.column} ${a.order} ,`;
			},sql);
			sql = sql.substr(0,sql.length -1);
		}
		if(scheme.limit){
			sql += ` limit ${scheme.limit.start},${scheme.limit.rows}`;
		}
		if(isCount){
			sql += ' ) z';
		}
		let sqlobj = {sql : sql,params : params};
		if(tool.config.sql){
			console.log(sqlobj)
		}
		return sqlobj;
	}
};

module.exports = tool;