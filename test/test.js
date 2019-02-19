let query = require('../lib/index');
let assert = require('assert');
/**
 * 链接本地数据库
 **/
query.query({
	host : '127.0.0.1',
	port : '3306',
	user : 'root',
	password : 'root',
	database : 'test'
});
//测试函数
(async function test(){
	try{
		let tableName = 'test',tableName2 = 'info';//主表以及从表
		//删除表结构并创建空表
		before(async ()=>{
			let dropSql = `drop table if exists ${tableName}`;
			let dropSql2 = `drop table if exists ${tableName2}`;
			await query.query({sql : dropSql,params : []});
			await query.query({sql : dropSql2,params : []});
			//创建表结构
			let tableCreateSql = `
				create table ${tableName} (
					id varchar(25),
					name varchar(25)
				)
			`;
			let tableCreateSql2 = `
				create table ${tableName2} (
					id varchar(25),
					title varchar(25),
					pid varchar(25)
				)
			`;
			//创建表结构
			await query.query({sql : tableCreateSql,params : []})
			await query.query({sql : tableCreateSql2,params : []})
		});

		describe('#desc()',async ()=>{
			it(`返回${tableName}的两个字段`,async ()=>{
				let tableInfo = await query.desc(tableName)
				assert.equal(2,tableInfo.length)	
			});
			it(`分别为id和name`,async ()=>{
				let tableInfo = await query.desc(tableName)
				let columnA = tableInfo[0],
					columnB = tableInfo[1];
				assert.equal('id',columnA.Field);
				assert.equal('name',columnB.Field);
			})
		})
		describe('#count()',async ()=>{
			it(`查询表${tableName}数量为0条`,async ()=>{
				let count = await query.search(tableName).count();
				assert.equal(0,count);
			})
		})
		describe('#insert()',async ()=>{
			it('插入一条记录成功',async ()=>{
				await query.search(tableName).insert({
					id : '1',
					name :'testName'
				});
				let count = await query.search(tableName).count();
				assert.equal(1,count);
			});
			it('批量插入两条记录成功',async ()=>{
				await query.search(tableName2).insert([
					{id : '2',title : 'testA',pid : '1'},
					{id : '3',title : 'testB',pid : '1'}
				]);
				let count = await query.search(tableName2).count();
				assert.equal(2,count);
			})
		});
		describe('#get()',()=>{
			it('获得主表第一条记录name==testName',async ()=>{
				let obj = await query.search(tableName).where({id : '1'}).get();
				assert.equal('testName',obj.name);
			})
		})
		describe('#update()',()=>{
			it('更新主表name为updateName',async ()=>{
				await query.search(tableName).where({id :'1'}).update({name : 'updateName'});
				let obj = await query.search(tableName).where({id : '1'}).get();
				assert.equal('updateName',obj.name);
			})
		});
		describe('#list()',()=>{
			it('简单查询，从表记录为2条',async ()=>{
				let list = await query.search(tableName2).list();
				assert.equal(2,list.length);
			});
			it('简单查询(按照id排序)从表记录第二条name为testA',async ()=>{
				let list = await query.search(tableName2).order({column : 'id',order : 'desc'}).list();
				let obj = list[1];
				assert.equal('testA',obj.title);
			});
			it('从表关联主表查询主表name',async ()=>{
				let list = await query.search(tableName2).join(tableName,{
					alias : 't1',join : [{main : 'pid',foreign : 'id'}]
				}).list();
				assert.equal('updateName',list[0].name);
			})
			it('从表查询条件:title like test',async()=>{
				await query.search(tableName2).insert([
					{id : '4',title:'likeA',pid : '2'},
					{id : '5',title : 'likeB',pid : '3'}
				]);
				let count = await query.search(tableName2).where({title : {like : true,value : '%test%'}}).count();
				assert.equal(2,count);
			})
			it('从表查询条件为or,title like like 或 pid =3 ',async ()=>{
				let count = await query.search(tableName2).where({pid : '3'}).or({title : {like : true,value : '%test%'}}).count();
				assert.equal(3,count);
			});
			it('排序并分页，从第二个开始每两个一页，获得第二个数据为likeA',async ()=>{
				let list = await query.search(tableName2).order({column : 'id',order : 'asc'}).limit(1,2).list();
				let obj = list[1];
				assert.equal('likeA',obj.title);
			})
		})
		
		describe('#delete()',()=>{
			it('删除主表的所有记录',async ()=>{
				await query.search(tableName).delete();
				let count = await query.search(tableName).count();
				assert.equal(0,count);
			})
			it('删除从表的pid=1的记录，剩余2',async ()=>{
				await query.search(tableName2).where({pid : '1'}).delete();
				let count = await query.search(tableName2).count();
				assert.equal(2,count);
			})
			it('清空从表所有记录',async ()=>{
				await query.search(tableName2).delete();
				let count = await query.search(tableName2).count();
				assert.equal(0,count);
			})
		})

		describe('#query()',()=>{
			it('删除两个表,查询报错[ER_NO_SUCH_TABLE]',async ()=>{
				let sqlA = `drop table if exists ${tableName}`;
				let sqlB = `drop table if exists ${tableName2}`;
				await query.query([{sql :sqlA,params : []},{sql : sqlB,params : []}])
				try{
					let info = await query.desc(tableName)
				}catch(e){
					assert.equal('ER_NO_SUCH_TABLE',e.code);
				}
			})
		})
		describe('全部测试完成',()=>{
			it('退出系统',()=>{
				process.exit(0);
			});
		})
	}catch(e){
		console.log(e);
	}
	
})();
