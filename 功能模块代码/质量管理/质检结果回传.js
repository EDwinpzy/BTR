/*
 * @Author: EDwin
 * @Date: 2021-12-27 09:40:33
 * @LastEditors: EDwin
 * @LastEditTime: 2022-03-28 16:23:01
 */
/**
 * @type: KC请求式脚本
 * @description: 质检结果回传，将结果更新到ERP接口表，WMS接口表，MES内部库存表
 * @param {object[]} QCinfo - WMS质检推送信息
 *                                  {
                                        system: [1,2,3] '回传位置 1：ERP，2：WMS，3：MES'
                                        stockcode: '物料编号',
                                        stocktype： '物料类型 1：原材料  2：半成品/成品'
                                        jobID: '若为成品/半成品则是MES大批次，若为原材料则是ERP大批次',
                                        jobIDS: '原材料小批次/成品半成品小批次（收料小批次）',(若为空则按大批次来推送质检结果)
                                        QCresult: '质检结果 0：不合格 1：合格 ',
                                    }
 * @return {boolean} 成功返回true，失败返回false并在控制台打印错误信息
 */
var func = require('e:/OneDrive/亚控科技/项目资料/常州贝特瑞项目/负极二期/功能模块代码/KP自定义函数');
async function QCresultBack(QCinfo) {
    debugger;
    //质检任务表
    var QC_dataBase = ['QC_RealTimeTask'];
    //WMS接口表信息['质检信息推送接口表']
    var WMS_dataBase = ['WMS_QCinfo'];
    //MES内部表信息['库存批次信息表']
    var MES_dataBase = ['storage_batch'];
    //ERP接口表信息['质检特征值表', '质检任务结果']
    var ERP_dataBase = ['DetectionCharacteristicValue', 'QC_determination'];
    try {
        /*******************************WMS质检信息推送接口*************************** */
        if (QCinfo.system.indexOf(2) > -1) {
            if (QCinfo.jobIDS !== undefined && QCinfo.jobIDS !== '') {
                //按小批次推送
                var WMS_config = [
                    {
                        //WMS接口表字段信息及对应的值
                        Item_No: QCinfo.stockcode,
                        Batch_No: QCinfo.jobID,
                        SecondBatch_No: QCinfo.jobIDS,
                        Quality_Result: QCinfo.QCresult == 0 ? 20 : QCinfo.QCresult == 1 ? 00 : 10,
                        Sync_Time: func.GetDataTimeFunc(),
                    },
                ];
                var res = await func.SqlInsert(WMS_config, WMS_dataBase[0]);
                if (!res) throw 'WMS质检信息接口表插入失败！';
            } else {
                //按大批次推送
                var QC_RealTimeTask = await func.toDataSet('BTR', `SELECT jobIDS FROM ${QC_dataBase[0]} WHERE jobID = ${QCinfo.jobID}`);
                if (!WMS_QCinfo) throw 'QC_RealTimeTask质检任务表查询失败！';
                var WMS_config = {
                    //WMS接口表字段信息及对应的值
                    Item_No: QCinfo.stockcode,
                    Batch_No: QCinfo.jobID,
                    SecondBatch_No: '',
                    Quality_Result: QCinfo.QCresult == 0 ? 20 : 00,
                    Sync_Time: func.GetDataTimeFunc(),
                };
                //拼接数据集用于插入
                var arr = [];
                QC_RealTimeTask.forEach(function (item) {
                    WMS_config.SecondBatch_No = item;
                    arr.push(WMS_config);
                });
                var res = func.SqlInsert(arr, WMS_dataBase[0]);
                if (!res) throw 'WMS质检信息接口表插入失败！';
            }
        }
        /*******************************MES内部库存表质检推送**************************** */
        if (QCinfo.system.indexOf(3) > -1) {
            var MES_config = {
                //MES内部表字段信息及对应的值
                jobIDS: QCinfo.jobIDS,
                QCresult: QCinfo.QCresult == 0 ? 2 : 1,
            };
            var primaryKey = ['jobIDS']; //更新条件字段名数组

            var MES_field = [];
            var MES_value = [];
            for (var key in MES_config) {
                if (primaryKey.indexOf(key) == -1) {
                    //剔除筛选条件
                    MES_field.push(key);
                    MES_value.push("'" + MES_config[key] + "'");
                }
            }
            var sqlStr = `UPDATE ${MES_dataBase[0]} SET `;
            for (var i = 0; i < MES_field.length; i++) {
                sqlStr += `${MES_field[i]} = ${MES_value[i]},`;
            }
            sqlStr = sqlStr.substring(0, sqlStr.length - 1);
            sqlStr += ` WHERE `;
            primaryKey.forEach(function (item) {
                sqlStr += `${item} = '${MES_config[item]}' AND `;
            });
            sqlStr = sqlStr.substring(0, sqlStr.length - 4);
            var res = await func.toDataSet('BTR', sqlStr);
            if (!res) throw 'MES内部表' + MES_dataBase[0] + '更新失败！';
        }
        /*********************************ERP质检任务结果和检测特征值推送************************** */
        if (QCinfo.indexOf(1) > -1) {
        }
        return true;
    } catch (e) {
        // logWrite(dirname, text);
        console.log(e);
        return false;
    }
}
