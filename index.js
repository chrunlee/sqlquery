/***
 * sql query tool
 * @author chrunlee
 ***/

let query = require('simple-mysql-query');


let tool = {
	query : query,
	cache : [],//存放scheme
	scheme : {},
	/***
	 * 提供表名，查询表中的字段数据
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
	//确定表名
	/***
	 * tool.search('sys_user').list() //增加主表
	 *
	 ***/
	search (table){
		// let scheme = tool.getScheme();
		let scheme = tool._getScheme();
		scheme.table = table;
		return tool;
	},
	//and 的查询条件
	/*******
	 * tool.search('sys_user').where({
	 * 		id : '111',
	 *		name : {
	 *			table : 't1',value : 'test' // table : join 表的别名
	 *		}	
	 * }).list()
	 ******/
	where(obj){
		let scheme = tool._getScheme();
		scheme.where = obj;
		return tool;
	},
	//链接其他表
	/*****
	 *
	 * tool.search('sys_user').join('sys_article',{
	 *  	alias : 't1',
  	 *		join : [{main :'id',foreign : 'userid'}] //main 主表字段名，foreign : join表字段名
	 * }).list()
	 *
	 *****/
	join(table,options){
		let scheme = tool._getScheme();
		scheme.join = (scheme.join||[]).concat([{table : table,options : options||{}}]);
		return tool;
	},
	//表排序
	/******
	 * tool.search('sys_user').order({
	 *		column : 'createtime',order : 'desc',alias : 't1'//alias 表别名，不写为主表
	 * }).list()
	 *
	 ***/
	order( orderArr ){
		let scheme = tool._getScheme();
		orderArr = (typeof orderArr == 'object' && orderArr.length>=0) ? orderArr : [orderArr];
		scheme.order = (scheme.order||[]).concat(orderArr);
		return tool;
	},
	//查询条件or
	/***** 
	 * tool.search('sys_user').where({name : 'test'}).or({title : 'test'}).list();
	 * //or 中不同object之间的关系为 or 与 where的关系也为or,但是同一个object中的关系为and ，与like正好相反
	 *
	 *****/
	or( orobj ){
		let scheme = tool._getScheme();
		scheme.or = (scheme.or||[]).concat(orobj);
		return tool;
	},
	//限制数据
	/*****
	 * tool.search('sys_user').limit(1,3).list();//limit(start,rows)
	 *
	 ****/
	limit (start,rows){
		let scheme = tool._getScheme();
		scheme.limit = {start : start,rows : rows};
		return tool;
	},
	//结束调用，必须调用list ,update ,delete ,insert 的一个
	list (){
		return query(tool._createSql('select',tool._getScheme())).then(rs=>{
			return rs[0];
		})
	},
	//结束调用，更新
	update( data ){//更新data中的数据
		return query(tool._createSql('update',tool._getScheme(),data)).then(rs=>{
			return rs[0];
		});
	},
	delete( ){//更新data中的数据
		return query(tool._createSql('delete',tool._getScheme())).then(rs=>{
			return rs[0];
		});
	},
	//插入语句，没有where等条件
	insert( data ){//更新data中的数据
		return query(tool._createSql('insert',tool._getScheme(),data)).then(rs=>{
			return rs[0];
		});
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

		if(type == 'select'){
			if(scheme.join && scheme.join.length > 0){
				//把join的table加入
				sql += ` ${tableAlias}.*`;
				sql += scheme.join.reduce((_,a,i)=>{
					return _ +`,${a.options.alias || 't'+i}.*`;
				},'');
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
		if(scheme.where){
			//默认都是主表的字段，否则根据table -value 来定值
			sql += ` where`;
			for(let name in scheme.where){
				let nameOpt = scheme.where[name];
				let whereAlias = typeof nameOpt == 'object' ? (nameOpt.table || tableAlias) : tableAlias;
				let whereValue = typeof nameOpt == 'object' ? (nameOpt.value || '') : nameOpt;
				let tempOperate = typeof nameOpt == 'object' ? (nameOpt.like ? 'like' : '=') : '='
				sql += ` ${whereAlias}.${name} ${tempOperate} ?  and`;
				params.push(whereValue);
			}
			sql = sql.substr(0,sql.length -3);
		}
		//or 与where 类似，不同的是or里面都是用的and
		if(scheme.or && scheme.or.length > 0){	
			sql += ` ${sql.indexOf('where') >-1 || sql.indexOf('and') >-1 ? ' or ' : ' where '}`;
			let tempSql = scheme.or.reduce((_,a,i)=>{
				let tempStr = '';
				for(let key in a){
					let tempAlias = typeof a[key] == 'object' ? (a[key].alias||tableAlias) : tableAlias;
					let tempValue = typeof a[key] == 'object' ? a[key].value : a[key];
					let tempOperate = typeof a[key] == 'object' ? (a[key].like ? 'like' : '=') : '='
					tempStr += ` ${tempAlias}.${key} ${tempOperate} ? and`;
					params.push(tempValue);
				}
				tempStr = tempStr.substr(0,tempStr.length-3);
				return _ + ` ( ${tempStr} ) or`;
			},'');
			tempSql = `( ${tempSql.substr(0,tempSql.length -2)} )`;
			sql += tempSql;
		}
		
		//多条order记录，按照顺序来
		if(scheme.order && scheme.order.length > 0){
			sql += ` order by `;
			sql = scheme.order.reduce((_,a,i)=>{
				return sql + ` ${a.alias||tableAlias}.${a.column} ${a.order} ,`;
			},sql);
			sql = sql.substr(0,sql.length -1);
		}
		if(scheme.limit){
			sql += ` limit ${scheme.limit.start},${scheme.limit.rows}`;
		}
		return {sql : sql,params : params};
	}
};
module.exports = tool;
