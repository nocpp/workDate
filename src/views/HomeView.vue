<template>
  <div class="main-app-container">
    <van-nav-bar title="排班日历" />
    <div class="cache-switch" flex="cross:center">
      <span class="switch-label">联网开关：</span>
      <van-switch :size="16" @change="handleSwitchChange" v-model="isOnlined">
      </van-switch>
    </div>
    <div class="work-loop-setting">
      <van-cell @click="dataModalShow = true" title="排班设置" is-link>
        <template #value>
          <van-tag class="tag-item" v-for="item in radioOptions" :key="item.value"
            :type="item.value === +todayWorkType.loopValue ? 'primary' : 'default'">{{ item.text }}</van-tag>
        </template>
      </van-cell>
      <van-cell @click="jumpDateShow = true" title="农历跳转" is-link></van-cell>
    </div>
    <div class="calendar-container" v-if="!isLoading">
      <vue-hash-calendar ref="calendarRef" :disabled-week-view="true" picker-type="date">
        <template v-slot:day="scope">
          <div @click="setDayDetailShow(scope?.date)" class="lunar-content" :class="{'release-day': showDateTip(scope?.date).indexOf('休') !== -1}">
            <div>{{ scope?.date.day }}</div>
            <div class="lunar-txt">{{ showDateTip(scope?.date) }}</div>
            <div v-if="isShowRemarkDay(scope?.date)" class="debounce-tips" flex="main:center cross:center">备</div>
          </div>
        </template>
      </vue-hash-calendar>
    </div>
    <van-skeleton title :row="3" v-else/>

    <van-dialog v-model:show="dataModalShow" title="数据设置" :show-cancel-button="false">
      <van-form ref="formRef">
        <van-cell-group inset>
          <van-field v-model="loopDataValue" name="loopDataValue" label="排班顺序" placeholder="早、中、夜..."
            :rules="[{ required: true, message: '请填写排班顺序' }]" />
          <van-field :rules="[{ required: true, message: '请选择当天排班' }]" v-model="todayWorkType.loopValue" is-link readonly name="picker" label="今天班次" placeholder="选择今天是什么班？"
            @click="showPicker = true" />
        </van-cell-group>
      </van-form>
      <template #footer>
        <van-button @click="changeData" block type="primary">确定</van-button>
      </template>
    </van-dialog>

    <van-dialog v-model:show="dayDetailModalShow" title="日期详情" :show-cancel-button="false">
      <div>
        <van-field label="阳历" colon :model-value="`${detailDayInfo.sloarDate}(${detailDayInfo.dayTips})`" readonly />
        <van-field label="农历" colon :model-value="detailDayInfo.lunarDate" readonly />
        <van-field
          label="是否弹班"
          readonly
        >
          <template #input>
            <van-switch v-model="detailDayInfo.isDebouceDay" :size="`18px`" />
          </template>
        </van-field>
        <van-field v-model="detailDayInfo.remark" rows="5" placeholder="请输入备注"label="备注信息" colon type="textarea" />
      </div>
      <template #footer>
        <div style="padding-bottom: 20px;"flex="main:center">
          <van-button style="margin-right: 20px;width: 80px;" @click="dayDetailModalShow = false">取消</van-button>
          <van-button style="width: 80px;" :loading="saveLoading" @click="saveDayData" type="primary">保存</van-button>
        </div>
      </template>
    </van-dialog>

    <van-popup v-model:show="showPicker" position="bottom">
      <van-picker :columns="radioOptions" @confirm="onConfirm" @cancel="showPicker = false" />
    </van-popup>
    <van-popup
      v-model:show="jumpDateShow"
      position="bottom"
      :style="{ height: 'auto' }"
    >
      <van-date-picker
        title="选择农历"
        :min-date="minDate"
        @confirm="handleJump"
        @cancel="jumpDateShow = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Solar, Lunar } from 'lunar-javascript'
import dayjs from 'dayjs'
import localforage from 'localforage'
import { showLoadingToast, showToast } from 'vant'

const loopDataValue = ref()
const dataModalShow = ref(false)
const dayDetailModalShow = ref(false)
const jumpDateShow = ref(false)
const todayWorkType = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  loopValue: undefined
})
const showPicker = ref(false)
const formRef = ref()
const isLoading = ref(true)
const debounceWorkDays = ref({})
const detailDayInfo = ref({
  sloarDate: '',
  lunarDate: '',
  isDebouceDay: false,
  remark: '',
  dayTips: ''
})
const saveLoading = ref(false)
const hasDataDate = ref([])
const nowYear = dayjs().format('YYYY')
const minDate = ref(new Date(`${nowYear}/01/01`))

const isOnlined = ref(true)
const calendarRef = ref(null)

const radioOptions = computed(() => {
  if (loopDataValue.value) {
    return loopDataValue.value.split('、').map((item, index) => ({ text: item, value: index + 1 }))
  } else {
    return []
  }
})

const handleJump = ({ selectedValues }) => {
  const sloarDateVal = Lunar.fromYmd(...selectedValues).getSolar().toString()
  const sloarDateValList = sloarDateVal.split('-')
  calendarRef.value.reset(new Date(sloarDateValList[0], Number(sloarDateValList[1]) - 1, sloarDateValList[2]))
  jumpDateShow.value = false
}

const setDayDetailShow = async (date) => {
  const theDayObj = dayjs(new Date(date.year, date.month, date.day))
  const curDetailDate = theDayObj.format('YYYY-MM-DD')
  detailDayInfo.value = {
    sloarDate: curDetailDate,
    lunarDate: Solar.fromDate(new Date(date.year, date.month, date.day)).getLunar().toString()
  }
  dayDetailModalShow.value = true
  saveLoading.value = true
  const dateInfo = await localforage.getItem(curDetailDate)
  if (dateInfo) {
    const dateDataObj = JSON.parse(dateInfo)
    detailDayInfo.value = dateDataObj
  }
  detailDayInfo.value.dayTips = showDateTip(date)
  saveLoading.value = false
}

const saveDayData = async () => {
  saveLoading.value = true
  try {
    await localforage.setItem(detailDayInfo.value.sloarDate, JSON.stringify(detailDayInfo.value))
    dayDetailModalShow.value = false
    showToast('保存成功')
    getAllKey()
  } catch (error) { } finally {
    saveLoading.value = false
  }
}

const changeData = async () => {
  try {
    formRef.value.submit()
    await formRef.value.validate()

    localStorage.setItem('workLoopData', loopDataValue.value)
    localStorage.setItem('workNowData', JSON.stringify({
      date: dayjs().format('YYYY-MM-DD'),
      loopValue: todayWorkType.loopValue
    }))
    dataModalShow.value = false

    isLoading.value = true
    setTimeout(() => {
      isLoading.value = false
    }, 800)
  } catch (error) {
    console.log('errlog: ', error)
  }
}

const onConfirm = (val) => {
  todayWorkType.loopValue = val.selectedValues[0]
  showPicker.value = false
}

const isShowRemarkDay = (date) => {
  if (date) {
    const theDayObj = dayjs(new Date(date.year, date.month, date.day))
    const theDate = theDayObj.format('YYYY-MM-DD')

    return hasDataDate.value.includes(theDate)
  } else {
    return ''
  }
}

const showDateTip = (date) => {
  const workLoopData = localStorage.getItem('workLoopData')
  let label = ''
  if (todayWorkType.loopValue && workLoopData) {
    const loopList = workLoopData.split('、')

    const theDayObj = dayjs(new Date(date.year, date.month, date.day))
    const theDate = theDayObj.format('YYYY-MM-DD')

    const theIndex = calcLoopIndexByDate(todayWorkType.date, theDate, todayWorkType.loopValue)
    label = loopList[theIndex - 1] || ''

    if (label === '休' && theDayObj.day() === 5) {
      label = '早*'
    }
  }

  return label
}

const calcLoopIndexByDate = (oldDate, newDate, oldIndex) => {
  const workLoopData = localStorage.getItem('workLoopData')
  let dayDiffNum = dayjs(newDate).diff(dayjs(oldDate), 'day')
  const loopLen = workLoopData.split('、').length

  dayDiffNum = dayDiffNum % loopLen // +、-、0

  oldIndex = Number(oldIndex)

  const newIndex = oldIndex + dayDiffNum + loopLen

  if (newIndex % loopLen === 0) {
    return loopLen
  } else {
    return newIndex % loopLen
  }
}

const getAllKey = async () => {
  const keys = await localforage.keys()
  hasDataDate.value = keys
}

onMounted(() => {
  initDB()
  getAllKey()
  const workLoopData = localStorage.getItem('workLoopData')
  let workNowData = localStorage.getItem('workNowData')
  let debounceWorkDaysFromStorage = localStorage.getItem('debounceWorkDays')
  let isOnlinedStorage = localStorage.getItem('isOnlinedStorage') || 'true'
  isLoading.value = true

  if (isOnlinedStorage === 'true') {
    isOnlined.value = true
  } else {
    isOnlined.value = false
  }
  setServiceWorker(isOnlined.value)

  if (workLoopData && workNowData) {
    try {
      workNowData = JSON.parse(workNowData)
      loopDataValue.value = workLoopData

      const nowDate = dayjs().format('YYYY-MM-DD')

      todayWorkType.date = nowDate
      todayWorkType.loopValue = calcLoopIndexByDate(workNowData.date, nowDate, workNowData.loopValue)

      localStorage.setItem('workNowData', JSON.stringify({
        date: todayWorkType.date,
        loopValue: todayWorkType.loopValue
      }))

      if (debounceWorkDaysFromStorage) {
        debounceWorkDaysFromStorage = JSON.parse(debounceWorkDaysFromStorage)
        debounceWorkDays.value = debounceWorkDaysFromStorage || {}
      }
    } catch (error) { console.log('qxdlog: ', error) } finally {
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
})

const initDB = () => {
  localforage.config({
    driver      : localforage.INDEXEDDB, // Force WebSQL; same as using setDriver()
    name        : 'workDate',
    version     : 1.0,
    storeName   : 'dateData', // Should be alphanumeric, with underscores.
    description : 'some data about date'
  });
}

const handleSwitchChange = (val) => {
  localStorage.setItem('isOnlinedStorage', val)
  setServiceWorker(val)
}

const clearAllCache = () => {
  if (window.caches) {
    window.caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        window.caches.delete(cacheName);
      });
    });
  }
}

const setServiceWorker = (newOnlineState) => {
  if ('serviceWorker' in navigator) {
    if (!newOnlineState) { // 离线状态
      navigator.serviceWorker.register('/sw.js').then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    } else {
      clearAllCache()
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }
}

// watch(radioOptions, (newVal, oldVal) => {
//   if (newVal.length !== oldVal.length) {
//     todayWorkType.loopValue = undefined
//   }
// })
</script>

<style lang="less" scoped>
.main-app-container {
  position: relative;
  max-width: 500px;
  margin: 0 auto;

  .cache-switch {
    position: absolute;
    left: 16px;
    top: 0;
    height: 46px;
    z-index: 999;

    .switch-label {
      color: #969799;
      font-size: 14px;
    }
  }

  .work-loop-setting {
    border-bottom: 1px solid #eee;
  }

  :deep(.van-cell__value) {
    text-align: left;
  }

  .tag-item {
    margin-right: 5px;
  }

  .calendar-container {
    :deep(.calendar_item) {
      padding: 6px 0;

      .calendar_day {
        border-radius: 3px;
      }

      .calendar_first_today {
        color: inherit;
      }

      .lunar-content {
        width: 100%;
        position: relative;
        font-size: 14px;
        text-align: center;

        .debounce-tips {
          position: absolute;
          right: -10px;
          top: -2px;
          font-size: 12px;
          color: #fff;
          background-color: rgb(245, 38, 38);
          border-radius: 50%;
          width: 16px;
          height: 16px;
        }
      }

      .release-day {
        border: 1px solid #9f76f6;
        border-radius: 6px;
      }

      .lunar-txt {
        font-size: 12px;
        text-align: center;
      }
    }
  }
}
</style>