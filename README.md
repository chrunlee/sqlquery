# sqlquery
sql query sqlquerys for mysql or others? 

主要是提供一些简单数据库表的查询、更新、删除，如果是比较复杂的语句，还是可以直接写入sql语句来查询。

//目前主要是自己使用，经常做一些小站，不需要太复杂的SQL，但是要写好多好多的lib包，才能开始数据库查询，还是很麻烦。

# 使用说明

- 安装
```
npm install sqlquery-tool 
```

- 引入
```
let sqlquery = require('sqlquery-tool');
//配置链接数据库
sqlquery({
	host : '127.0.0.1',
	port : '3306',
	user : 'root',
	password : 'root',
	database : 'test'
});
```

- 查询所有记录
```
sqlquery.search('sys_user').list()
.then(rs=>{
	console.log(rs);//获得所有记录
})
.catch(err=>{
	console.log(err);
})
```

API 说明:

	1.sqlquery.search(tableName) 添加主表
	2.sqlquery.search(tableName).where(whereObject) 添加查询条件
	3.sqlquery.search(tableName).where(whereObject).or(orObject) 添加or查询条件
	4.sqlquery.search(tableName).where(whereObject).or(orObject).order(orderObject) 添加排序
	5.sqlquery.search(tableName).join(otherTable) 添加关联查询
	6.sqlquery.search(tableName).limit(1,3) 添加条数限制
	7.sqlquery.search(tableName).list() 查询记录
	8.sqlquery.search(tableName).delete() 删除记录
	9.sqlquery.search(tableName).update(data) 更新记录
	10.sqlquery.search(tableName).insert(data) 插入记录
	11.sqlquery.query({sql : sql,params : [p1]}) 执行复杂sql语句

	相关的配置参数和格式下面继续说明

- where(whereObj)

用于添加限制条件，where中的对象，目前只能用一个，不能多次使用，否则会覆盖。
```
sqlquery.search('sys_user').where({
	name : 'test',
	title : {
		alias : 't1',//如果有关联表，可以写关联表的别名
		value : '%test%',
		like : true // 增加like 为like语句
	}
})
```

在where中所有的条件之间的关系都是 `and` 关系。

- join(tableName,options)

用于添加关联表，加入后可以关联查询（与where中的alias对应）

```
sqlquery.search('sys_user').join('sys_article',{
	alias : 't1',//alias可以不写，按照顺序编名
	join : [{main : 'articleid',foreign : 'id'}]//在join中可以增加多个on条件，main为主表的字段，foreign为关联表的字段
})
```

- or(orObject)

用于or关系的限制条件 ，与where之间使用or关系，在or中自己对象内为and的关系，多个orObject的关系为or,如下：

```
sqlquery.search('sys_user').where({id : '1'}).or({name : 'test',desc : 'abc'}).or({title : {value : '%test%',like : true}})

//生成的语句为下
-- select  22476g.* from sys_user as 22476g where 22476g.id = ?    or (  (  22476g.name = ? and 22476g.desc = ?  ) or (  22476g.title like ?  )  )
```

- order(orderObj)

用于添加排序字段，可以支持关联表字段排序，如下：
```
sqlquery.search('sys_search').order({column : 'id',order : 'asc'}).order([{column : 'name',alias : 't1',order : 'desc'},{column : 'ctime',order : 'desc'}])
```

- limit(start,rows)

用于限制条数语句
```
sqlquery.search('sys_search').limit(1,10).list() 
```

- 查询类型：增删改查

insert : 新增
delete : 删除
update : 更新
list : 查询。

其中，更新和新增都需要传递数据对象。
```
sqlquery('sys_user').update({
	name : 'test'
})

sqlquery('sys_user').insert({
	name : 'test'
})
```

这四个函数都是封装的`promise`，可以直接以promise形式返回值。除了这四个函数之外，其余的都是链式调用。

# 说明
目前正在实验阶段，随时会修改。


# License
MIT LICENSE
